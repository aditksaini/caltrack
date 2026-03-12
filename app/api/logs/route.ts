import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, quantity_description, calories, protein, carbs, fat, nutritional_breakdown } = body;

    // Get today's UTC-based date string in YYYY-MM-DD format (local time handling could be added)
    const today = new Date().toLocaleDateString('en-CA');

    // Make sure DailyLog exists for today
    let log = await prisma.dailyLog.findUnique({
      where: { date: today }
    });

    if (!log) {
      log = await prisma.dailyLog.create({
        data: {
          date: today,
        }
      });
    }

    // Add the FoodEntry and connect to DailyLog
    const entry = await prisma.foodEntry.create({
      data: {
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

    // Update DailyLog Totals
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

export async function GET() {
  try {
    const logs = await prisma.dailyLog.findMany({
      orderBy: { date: 'desc' },
      include: {
        foods: true
      }
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch logs' }, { status: 500 });
  }
}
