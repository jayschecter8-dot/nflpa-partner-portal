import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paymentSchema = z.object({
  partnerId: z.string().min(1, 'Partner ID is required'),
  playerName: z.string().min(1, 'Player name is required'),
  amount: z.number().positive('Amount must be positive'),
  totalPlayerAmount: z.number().optional().default(0),
  invoiceCode: z.string().min(1, 'Invoice code is required'),
  dealType: z.string().optional().nullable(),
  dealDetail: z.string().optional().nullable(),
  batchName: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
});

const bulkPaymentSchema = z.array(paymentSchema);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partnerId');
    const playerName = searchParams.get('playerName');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Build where clause based on user type
    const where: Record<string, unknown> = {};

    // Partner users can only see their own payments
    if (!session.user.isAdmin && session.user.partnerId) {
      where.partnerId = session.user.partnerId;
    } else if (partnerId) {
      where.partnerId = partnerId;
    }

    if (playerName) {
      where.playerName = {
        contains: playerName,
        mode: 'insensitive',
      };
    }

    // Filter by invoice code patterns for month/year
    if (month || year) {
      const invoiceFilters: string[] = [];
      if (year) {
        invoiceFilters.push(`${year}-%`);
      }
      if (month) {
        const monthMap: Record<string, string> = {
          January: 'JAN',
          February: 'FEB',
          March: 'MAR',
          April: 'APR',
          May: 'MAY',
          June: 'JUN',
          July: 'JUL',
          August: 'AUG',
          September: 'SEP',
          October: 'OCT',
          November: 'NOV',
          December: 'DEC',
        };
        const monthCode = monthMap[month];
        if (monthCode) {
          where.invoiceCode = {
            endsWith: monthCode,
          };
        }
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        partner: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isFullAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if it's a bulk upload or single payment
    if (Array.isArray(body)) {
      const validatedData = bulkPaymentSchema.parse(body);

      // Delete existing payments and insert new ones (replace mode)
      await prisma.$transaction(async (tx) => {
        await tx.payment.deleteMany({});
        await tx.payment.createMany({
          data: validatedData,
        });
      });

      return NextResponse.json({ success: true, count: validatedData.length }, { status: 201 });
    } else {
      const validatedData = paymentSchema.parse(body);

      const payment = await prisma.payment.create({
        data: validatedData,
        include: {
          partner: {
            select: { id: true, name: true },
          },
        },
      });

      return NextResponse.json(payment, { status: 201 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isFullAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all payments
    await prisma.payment.deleteMany({});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
