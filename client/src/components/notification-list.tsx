import { useQuery } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

export function NotificationList() {
  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const handleMarkAllAsRead = async () => {
    await apiRequest("POST", "/api/notifications/read-all");
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const handleMarkAsRead = async (id: number) => {
    await apiRequest("POST", `/api/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <h4 className="font-medium">Notifications</h4>
          {notifications?.length ? (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-auto">
          {notifications?.length ? (
            notifications.map(notification => {
              const actor = users?.find(u => u.id === notification.actorId);
              let content = "";
              let link = "";

              switch (notification.type) {
                case "like":
                  content = "liked your photo";
                  link = `/photos/${notification.photoId}`;
                  break;
                case "comment":
                  content = "commented on your photo";
                  link = `/photos/${notification.photoId}`;
                  break;
                case "follow":
                  content = "started following you";
                  link = `/profile/${notification.actorId}`;
                  break;
              }

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-2 p-3 cursor-default ${
                    notification.read ? "opacity-60" : ""
                  }`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <Link href={`/profile/${actor?.id}`} className="shrink-0">
                    <img
                      src={actor?.avatarUrl || "https://via.placeholder.com/40"}
                      alt={actor?.displayName || actor?.username}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  </Link>
                  <div className="flex-1 space-y-1">
                    <Link href={link} className="text-sm hover:underline">
                      <strong>{actor?.displayName || actor?.username}</strong>{" "}
                      {content}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })
          ) : (
            <p className="p-3 text-sm text-muted-foreground text-center">
              No notifications
            </p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
