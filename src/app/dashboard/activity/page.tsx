'use client';

import { useCallback, useEffect, useState } from 'react';
import { ActivityList } from '@/components/dashboard/ActivityList';
import { PageHeader } from '@/components/dashboard/parts';
import { Button } from '@/components/ui/button';
import { clearActivity, listActivity } from '@/lib/requests';
import { useNova } from '@/lib/store';
import type { ActivityItem } from '@/lib/midnight/types';

export default function ActivityPage() {
  const proofsVersion = useNova((s) => s.proofsVersion);
  const vaultVersion = useNova((s) => s.vaultVersion);
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  const refresh = useCallback(() => setItems(listActivity()), []);
  useEffect(refresh, [refresh, proofsVersion, vaultVersion]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Activity"
        description="A local audit trail of vault and proof events. Stored on this device only — NØVA servers keep no history of you."
        actions={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              clearActivity();
              refresh();
            }}
          >
            Clear log
          </Button>
        }
      />
      {items === null ? <div className="skeleton h-64 rounded-xl" /> : <ActivityList items={items} dense />}
    </div>
  );
}
