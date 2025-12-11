import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  partnerId: z.string().optional().nullable(),
  isAdmin: z.boolean().optional().default(false),
  isFullAdmin: z.boolean().optional().default(false),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contacts = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        isFullAdmin: true,
        partnerId: true,
        partner: {
          select: { name: true },
        },
        createdAt: true,
      },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only full admins can create other admins
    const body = await request.json();
    if ((body.isAdmin || body.isFullAdmin) && !session.user.isFullAdmin) {
      return NextResponse.json({ error: 'Only full admins can create admin users' }, { status: 403 });
    }

    const validatedData = contactSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const contact = await prisma.user.create({
      data: {
        ...validatedData,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        isFullAdmin: true,
        partnerId: true,
        partner: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
