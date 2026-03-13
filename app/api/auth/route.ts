import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Valid name is required' }, { status: 400 });
    }

    const cleanName = name.trim().toLowerCase();

    // Find existing user or create a new one
    let user = await prisma.user.findUnique({
      where: { name: cleanName }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { name: cleanName }
      });
    }

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name } });
  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Failed to authenticate user' }, { status: 500 });
  }
}
