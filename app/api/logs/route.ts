import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, quantity_description, calories, protein, carbs, fat, nutritional_breakdown, userId } = body;

    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 401 });

    const today = new Date().toLocaleDateString('en-CA');

    // 1. Ensure User exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 2. Find or Create DailyLog for THIS specific user today
    let log = await prisma.dailyLog.findUnique({
      where: {
        date_userId: { date: today, userId: user.id }
      }
    });

    if (!log) {
      log = await prisma.dailyLog.create({
        data: {
          date: today,
          userId: user.id
        }
      });
    }

    // 3. Create the FoodEntry connected to this specific DailyLog
    const entry = await prisma.foodEntry.create({
      data: {
        ...(id ? { id } : {}), // Accept frontend ID if passed for syncing
        name,
        quantity_description,
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
        nutritional_breakdown: nutritional_breakdown || {},
        logId: log.id
      }
    });

    // 4. Update the User's DailyLog Totals
    await prisma.dailyLog.update({
      where: { id: log.id },
      data: {
        totalCalories: log.totalCalories + Number(calories),
        totalProtein: log.totalProtein + Number(protein),
        totalCarbs: log.totalCarbs + Number(carbs),
        totalFat: log.totalFat + Number(fat),
      }
    });

    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    console.error('Error saving log:', error);
    return NextResponse.json({ error: error.message || 'Failed to save log' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Fetch ONLY the logs belonging to this specific user
    const logs = await prisma.dailyLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        foods: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearToday = searchParams.get('clearToday');
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const today = new Date().toLocaleDateString('en-CA');

    // Handle full day reset
    if (clearToday === 'true') {
      const log = await prisma.dailyLog.findUnique({
        where: { date_userId: { date: today, userId } }
      });
      
      if (log) {
        await prisma.foodEntry.deleteMany({ where: { logId: log.id } });
        await prisma.dailyLog.update({
          where: { id: log.id },
          data: { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
        });
      }
      return NextResponse.json({ success: true });
    }

    // Handle single item deletion
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const entry = await prisma.foodEntry.findUnique({
      where: { id },
      include: { log: true }
    });

    // Ensure they own the log
    if (!entry || entry.log.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized to delete this item' }, { status: 403 });
    }

    await prisma.foodEntry.delete({ where: { id } });

    // Update Totals
    await prisma.dailyLog.update({
      where: { id: entry.logId },
      data: {
        totalCalories: Math.max(0, entry.log.totalCalories - entry.calories),
        totalProtein: Math.max(0, entry.log.totalProtein - entry.protein),
        totalCarbs: Math.max(0, entry.log.totalCarbs - entry.carbs),
        totalFat: Math.max(0, entry.log.totalFat - entry.fat),
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting log:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete log' }, { status: 500 });
  }
}
