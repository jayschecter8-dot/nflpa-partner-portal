import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updatePartnerSchema = z.object({
  name: z.string().min(1).optional(),
  contractTotal: z.number().optional(),
  isFlexFund: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const partner = await prisma.partner.findUnique({
      where: { id: params.id },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { payments: true },
        },
      },
    });

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Calculate total spent
    const totalSpent = partner.payments.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({ ...partner, totalSpent });
  } catch (error) {
    console.error('Error fetching partner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updatePartnerSchema.parse(body);

    const partner = await prisma.partner.update({
      where: { id: params.id },
      data: validatedData,
    });

    return NextResponse.json(partner);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating partner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isFullAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.partner.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting partner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
