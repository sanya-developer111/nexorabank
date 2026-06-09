import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, ContractStatus, TransactionType } from '@prisma/client';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { WalletOperationsService } from '../common/services/wallet-operations.service';
import { toNumber } from '../common/utils/decimal.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletOps: WalletOperationsService,
  ) {}

  async getOpen(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [contracts, total] = await Promise.all([
      this.prisma.contract.findMany({
        where: { status: ContractStatus.OPEN },
        include: { poster: { select: { id: true, username: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contract.count({ where: { status: ContractStatus.OPEN } }),
    ]);

    return paginate(
      contracts.map((c) => ({ ...c, reward: toNumber(c.reward) })),
      total,
      page,
      limit,
    );
  }

  async getMyContracts(userId: string) {
    const contracts = await this.prisma.contract.findMany({
      where: { OR: [{ posterId: userId }, { takerId: userId }] },
      include: {
        poster: { select: { username: true, displayName: true } },
        taker: { select: { username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return contracts.map((c) => ({ ...c, reward: toNumber(c.reward) }));
  }

  async create(userId: string, dto: CreateContractDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId,
          accountType: AccountType.MAIN,
          amount: dto.reward,
          type: TransactionType.CONTRACT,
          description: `Contract escrow: ${dto.title}`,
        },
        tx,
      );

      await this.walletOps.credit(
        {
          userId,
          accountType: AccountType.ESCROW,
          amount: dto.reward,
          type: TransactionType.CONTRACT,
          description: `Contract escrow hold: ${dto.title}`,
        },
        tx,
      );

      return tx.contract.create({
        data: {
          posterId: userId,
          title: dto.title,
          description: dto.description,
          reward: dto.reward,
          deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        },
      });
    });
  }

  async take(userId: string, contractId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.status !== ContractStatus.OPEN) {
      throw new NotFoundException('Contract not available');
    }
    if (contract.posterId === userId) {
      throw new BadRequestException('Cannot take your own contract');
    }

    return this.prisma.contract.update({
      where: { id: contractId },
      data: { takerId: userId, status: ContractStatus.IN_PROGRESS },
    });
  }

  async complete(userId: string, contractId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.posterId !== userId) {
      throw new BadRequestException('Only poster can complete contract');
    }
    if (contract.status !== ContractStatus.IN_PROGRESS || !contract.takerId) {
      throw new BadRequestException('Contract not in progress');
    }

    const reward = toNumber(contract.reward);

    await this.prisma.$transaction(async (tx) => {
      await this.walletOps.debit(
        {
          userId,
          accountType: AccountType.ESCROW,
          amount: reward,
          type: TransactionType.CONTRACT,
          description: `Contract payment: ${contract.title}`,
        },
        tx,
      );

      await this.walletOps.credit(
        {
          userId: contract.takerId!,
          amount: reward,
          type: TransactionType.CONTRACT,
          description: `Contract completed: ${contract.title}`,
          fromUserId: userId,
        },
        tx,
      );

      await tx.contract.update({
        where: { id: contractId },
        data: { status: ContractStatus.COMPLETED, completedAt: new Date() },
      });
    });

    return { message: 'Contract completed', reward };
  }

  async cancel(userId: string, contractId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.posterId !== userId) {
      throw new NotFoundException('Contract not found');
    }
    if (contract.status === ContractStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed contract');
    }

    const reward = toNumber(contract.reward);

    await this.prisma.$transaction(async (tx) => {
      if (contract.status === ContractStatus.OPEN) {
        await this.walletOps.credit(
          {
            userId,
            accountType: AccountType.ESCROW,
            amount: reward,
            type: TransactionType.CONTRACT,
            description: `Contract refund: ${contract.title}`,
          },
          tx,
        );
      }

      await tx.contract.update({
        where: { id: contractId },
        data: { status: ContractStatus.CANCELLED },
      });
    });

    return { message: 'Contract cancelled' };
  }
}
