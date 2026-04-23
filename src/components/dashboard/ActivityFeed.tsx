import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const activities = [
  {
    id: 1,
    user: "Sarah Chen",
    initials: "SC",
    action: "completed task",
    target: "Dashboard Redesign",
    time: "2h ago",
    type: "Project"
  },
  {
    id: 2,
    user: "James Wilson",
    initials: "JW",
    action: "uploaded new",
    target: "Assets.zip",
    time: "4h ago",
    type: "File"
  },
  {
    id: 3,
    user: "Alex Rivera",
    initials: "AR",
    action: "commented on",
    target: "API Docs",
    time: "6h ago",
    type: "Review"
  },
  {
    id: 4,
    user: "Emily Blunt",
    initials: "EB",
    action: "started draft",
    target: "Q3 Report",
    time: "1d ago",
    type: "Report"
  }
];

export function ActivityFeed() {
  return (
    <Card className="border-none shadow-sm animate-fade-in-up">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="font-headline">Recent Activity</CardTitle>
        <Badge variant="secondary" className="font-normal">View All</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{activity.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {activity.user} <span className="font-normal text-muted-foreground">{activity.action}</span> {activity.target}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                  <span className="text-[10px] text-primary/60 font-semibold uppercase tracking-tighter">• {activity.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
