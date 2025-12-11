import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const partnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contractTotal: z.number().optional().default(0),
  isFlexFund: z.boolean().optional().default(false),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const partners = await prisma.partner.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    });

    // Get payment totals for each partner
    const partnersWithTotals = await Promise.all(
      partners.map(async (partner) => {
        const total = await prisma.payment.aggregate({
          where: { partnerId: partner.id },
          _sum: { amount: true },
        });
        return {
          ...partner,
          totalSpent: total._sum.amount || 0,
        };
      })
    );

    return NextResponse.json(partnersWithTotals);
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = partnerSchema.parse(body);

    const partner = await prisma.partner.create({
      data: validatedData,
    });

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error creating partner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
