import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Prisma } from '@prisma/client';

type Automation = Prisma.AutomationGetPayload<{}>;

interface AutomationListProps {
  automations: Automation[];
}

export function AutomationList({ automations }: AutomationListProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {automations.map((auto) => (
        <Card key={auto.id} className={auto.enabled ? 'border-green-200' : 'border-gray-200'}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{auto.name}</CardTitle>
              <Badge variant={auto.enabled ? 'default' : 'secondary'}>
                {auto.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <CardDescription>{auto.description}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500 font-medium">Trigger</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {auto.triggerType}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-gray-500 font-medium">Action</span>
              <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                {auto.actionType}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      {automations.length === 0 && (
        <div className="col-span-full p-8 text-center text-gray-500 border border-dashed rounded-lg">
          No automations configured for this organization yet.
        </div>
      )}
    </div>
  );
}
