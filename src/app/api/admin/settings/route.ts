import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { settings, settingsAuditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAllSettings, setConfig, deleteConfig, clearConfigCache } from '@/lib/config';
import { encrypt, decrypt, maskSecret } from '@/lib/encryption';

/**
 * GET /api/admin/settings
 * Fetch all settings (admin only)
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allSettings = await getAllSettings();

    // Group by category
    const grouped = allSettings.reduce(
      (acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      },
      {} as Record<string, typeof allSettings>
    );

    return NextResponse.json({ settings: allSettings, grouped });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings
 * Create a new setting (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value, category, isSecret, description } = body;

    if (!key || !value || !category) {
      return NextResponse.json(
        { error: 'Key, value, and category are required' },
        { status: 400 }
      );
    }

    // Check if setting already exists
    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: 'Setting with this key already exists' },
        { status: 409 }
      );
    }

    // Create the setting
    await setConfig(key, value, {
      category,
      isSecret: isSecret ?? false,
      description,
    });

    // Get the created setting
    const [created] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    // Log the creation
    await db.insert(settingsAuditLog).values({
      settingId: created.id,
      settingKey: key,
      userId: session.user.id,
      action: 'create',
      oldValue: null,
      newValue: isSecret ? encrypt(value) : value,
    });

    return NextResponse.json({
      success: true,
      setting: {
        id: created.id,
        key: created.key,
        maskedValue: isSecret ? maskSecret(value) : value,
        category: created.category,
        isSecret: created.isSecret,
        description: created.description,
      },
    });
  } catch (error) {
    console.error('Error creating setting:', error);
    return NextResponse.json(
      { error: 'Failed to create setting' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 * Update an existing setting (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value, category, isSecret, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      );
    }

    // Get the existing setting
    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    // Get old value for audit log
    let oldValue: string;
    try {
      oldValue = existing.isSecret ? decrypt(existing.value) : existing.value;
    } catch {
      oldValue = existing.value;
    }

    // Update the setting
    await setConfig(key, value, {
      category: category || existing.category,
      isSecret: isSecret ?? existing.isSecret,
      description: description ?? existing.description,
    });

    // Log the update
    const newIsSecret = isSecret ?? existing.isSecret;
    await db.insert(settingsAuditLog).values({
      settingId: existing.id,
      settingKey: key,
      userId: session.user.id,
      action: 'update',
      oldValue: existing.isSecret ? existing.value : oldValue,
      newValue: newIsSecret ? encrypt(value) : value,
    });

    // Clear the config cache
    clearConfigCache();

    return NextResponse.json({
      success: true,
      setting: {
        key,
        maskedValue: newIsSecret ? maskSecret(value) : value,
      },
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/settings
 * Delete a setting (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      );
    }

    // Get the existing setting
    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    // Log the deletion before deleting
    await db.insert(settingsAuditLog).values({
      settingId: null, // Setting is being deleted
      settingKey: key,
      userId: session.user.id,
      action: 'delete',
      oldValue: existing.value,
      newValue: null,
    });

    // Delete the setting
    await deleteConfig(key);

    // Clear the config cache
    clearConfigCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting setting:', error);
    return NextResponse.json(
      { error: 'Failed to delete setting' },
      { status: 500 }
    );
  }
}
