import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AccountType, TransactionType } from '@prisma/client';

import { paginate, PaginationDto } from '../common/dto/pagination.dto';

import { WalletOperationsService } from '../common/services/wallet-operations.service';

import { toNumber } from '../common/utils/decimal.util';

import { PremiumService } from '../premium/premium.service';

import { PrismaService } from '../prisma/prisma.service';



@Injectable()

export class TournamentsService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly walletOps: WalletOperationsService,

    private readonly premiumService: PremiumService,

  ) {}



  async getActive(userId: string, query: PaginationDto) {

    const page = query.page ?? 1;

    const limit = query.limit ?? 20;

    const skip = (page - 1) * limit;

    const tier = await this.premiumService.getActiveTier(userId);



    const [tournaments, total, joined] = await Promise.all([

      this.prisma.tournament.findMany({

        where: { isActive: true, endsAt: { gt: new Date() } },

        include: { _count: { select: { entries: true } } },

        orderBy: { startsAt: 'asc' },

        skip,

        take: limit,

      }),

      this.prisma.tournament.count({ where: { isActive: true, endsAt: { gt: new Date() } } }),

      this.prisma.tournamentEntry.findMany({

        where: { userId },

        select: { tournamentId: true },

      }),

    ]);



    const joinedSet = new Set(joined.map((e) => e.tournamentId));



    return paginate(

      tournaments.map((t) => ({

        id: t.id,

        name: t.name,

        description: t.description,

        prizePool: toNumber(t.prizePool),

        entryFee: toNumber(t.entryFee),

        maxPlayers: t.maxPlayers,

        playerCount: t._count.entries,

        startsAt: t.startsAt.toISOString(),

        endsAt: t.endsAt.toISOString(),

        premiumOnly: t.premiumOnly,

        isJoined: joinedSet.has(t.id),

        canJoin: this.canJoinTournament(t, tier, t._count.entries),

        entryFeeDiscount: tier ? 0.5 : 0,

      })),

      total,

      page,

      limit,

    );

  }



  private canJoinTournament(

    tournament: { maxPlayers: number; premiumOnly: boolean },

    tier: 'starter' | 'pro' | 'elite' | null,

    playerCount: number,

  ) {

    if (tournament.premiumOnly && tier !== 'elite') return false;

    const cap = tier ? Math.ceil(tournament.maxPlayers * 1.2) : tournament.maxPlayers;

    return playerCount < cap;

  }



  async join(userId: string, tournamentId: string) {

    const tournament = await this.prisma.tournament.findUnique({

      where: { id: tournamentId },

      include: { _count: { select: { entries: true } } },

    });

    if (!tournament || !tournament.isActive) {

      throw new NotFoundException('Tournament not found');

    }

    if (tournament.endsAt < new Date()) {

      throw new BadRequestException('Tournament has ended');

    }



    const tier = await this.premiumService.getActiveTier(userId);

    if (tournament.premiumOnly && tier !== 'elite') {

      throw new BadRequestException('Турнир только для NEXORA Elite');

    }



    const cap = tier ? Math.ceil(tournament.maxPlayers * 1.2) : tournament.maxPlayers;

    if (tournament._count.entries >= cap) {

      throw new BadRequestException('Tournament is full');

    }



    const existing = await this.prisma.tournamentEntry.findUnique({

      where: { tournamentId_userId: { tournamentId, userId } },

    });

    if (existing) throw new BadRequestException('Already joined');



    let entryFee = toNumber(tournament.entryFee);

    if (tier) entryFee = Math.floor(entryFee * 0.5);



    return this.prisma.$transaction(async (tx) => {

      if (entryFee > 0) {

        await this.walletOps.debit(

          {

            userId,

            amount: entryFee,

            type: TransactionType.TOURNAMENT,

            description: `Tournament entry: ${tournament.name}${tier ? ' (premium -50%)' : ''}`,

          },

          tx,

        );

      }



      return tx.tournamentEntry.create({

        data: { tournamentId, userId },

      });

    });

  }



  async submitScore(userId: string, tournamentId: string, score: number) {

    const entry = await this.prisma.tournamentEntry.findUnique({

      where: { tournamentId_userId: { tournamentId, userId } },

    });

    if (!entry) throw new NotFoundException('Not enrolled in tournament');



    return this.prisma.tournamentEntry.update({

      where: { id: entry.id },

      data: { score: Math.max(entry.score, score) },

    });

  }



  async getLeaderboard(tournamentId: string, query: PaginationDto) {

    const page = query.page ?? 1;

    const limit = query.limit ?? 20;

    const skip = (page - 1) * limit;



    const [entries, total] = await Promise.all([

      this.prisma.tournamentEntry.findMany({

        where: { tournamentId },

        include: {

          user: {

            select: {

              username: true,

              displayName: true,

              avatar: true,

              avatarFrame: true,

              title: true,

              level: true,

            },

          },

        },

        orderBy: { score: 'desc' },

        skip,

        take: limit,

      }),

      this.prisma.tournamentEntry.count({ where: { tournamentId } }),

    ]);



    return paginate(

      entries.map((e, i) => ({ ...e, rank: skip + i + 1 })),

      total,

      page,

      limit,

    );

  }

  @Cron('0 */5 * * * *')
  async distributeEndedTournamentPrizes() {
    const ended = await this.prisma.tournament.findMany({
      where: { isActive: true, endsAt: { lte: new Date() } },
      include: {
        entries: { orderBy: { score: 'desc' }, take: 10 },
      },
    });

    for (const tournament of ended) {
      const prizePool = toNumber(tournament.prizePool);
      const shares = [0.4, 0.25, 0.15, 0.1, 0.05, 0.025, 0.015, 0.005, 0.003, 0.002];

      await this.prisma.$transaction(async (tx) => {
        await tx.tournament.update({
          where: { id: tournament.id },
          data: { isActive: false },
        });

        for (let i = 0; i < tournament.entries.length; i++) {
          const entry = tournament.entries[i];
          const share = shares[i] ?? 0;
          const prize = Math.floor(prizePool * share);
          if (prize <= 0) continue;

          await this.walletOps.credit(
            {
              userId: entry.userId,
              accountType: AccountType.MAIN,
              amount: prize,
              type: TransactionType.TOURNAMENT,
              description: `Приз турнира «${tournament.name}» — ${i + 1} место`,
            },
            tx,
          );

          await tx.tournamentEntry.update({
            where: { id: entry.id },
            data: { rank: i + 1 },
          });
        }
      });
    }
  }

}


