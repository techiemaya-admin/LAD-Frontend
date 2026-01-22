"use client";
import React from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useRouter } from 'next/navigation';
import { ChevronDown, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout as logoutAction } from '@/store/slices/authSlice';
import authService from '@/services/authService';
import {
  clearNotifications,
  selectNotifications,
  selectUnreadCounts,
  selectTotalUnread,
  markNotificationRead,
} from '@/store/slices/notificationSlice';
import { markConversationAsReadUnified } from '@/store/slices/conversationSlice';
import { showSnackbar } from '@/store/slices/bootstrapSlice';
//test
type RootState = any;
interface HeaderProps {
  title?: string;
  subtitle?: string;
}
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning!';
  if (hour < 18) return 'Good Afternoon!';
  return 'Good Evening!';
};
const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const notifications = useSelector(selectNotifications, shallowEqual);
  const unreadCounts = useSelector(selectUnreadCounts, shallowEqual);
  const totalUnread = useSelector(selectTotalUnread, shallowEqual);
  const dispatch = useDispatch();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = React.useState(false);
  const [greeting, setGreeting] = React.useState('Good Day!'); // Default greeting for SSR
  const [displayName, setDisplayName] = React.useState('User'); // Default name for SSR
  const [displayRole, setDisplayRole] = React.useState('Team Manager'); // Default role for SSR
  const [isHydrated, setIsHydrated] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = React.useRef<HTMLDivElement | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);
  // Set greeting and user info on client side only
  React.useEffect(() => {
    if (!isHydrated) return;
    setGreeting(getGreeting());
    setDisplayName(user?.name || 'User');
    setDisplayRole(
      user?.role
        ? String(user.role).replace(/\b\w/g, (c: string) => c.toUpperCase())
        : 'Team Manager'
    );
  }, [user, isHydrated]);
  const handleMenuToggle = () => {
    setMenuOpen((prev) => !prev);
  };
  const handleLogout = async () => {
    try {
      await authService.logout();
      dispatch(logoutAction());
      setTimeout(() => router.push('/login'), 1200);
    } catch (e) {
      dispatch(logoutAction());
      setTimeout(() => router.push('/login'), 1200);
    }
    setMenuOpen(false);
  };
  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);
  // Close notification menu when clicking outside
  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(e.target as Node)) {
        setNotificationMenuOpen(false);
      }
    }
    if (notificationMenuOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [notificationMenuOpen]);
  const handleNotificationClick = (notificationId: string | number, conversationId?: string | number) => {
    dispatch(markNotificationRead(notificationId));
    if (conversationId) {
      router.push(`/conversation/${conversationId}`);
      setNotificationMenuOpen(false);
    }
  };
  const unreadNotifications = notifications.filter(n => !n.read);
  return (
    <div className="
  w-full h-[88px] 
  flex items-center justify-between 
  px-2 py-0 
  rounded-b-[24px] 
  box-border relative overflow-visible
  flex flex-col sm:flex-row sm:items-center 
  bg-gradient-to-r 
  from-blue-50 via-white to-purple-50 
  dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 
  shadow-lg 
  border border-gray-200 dark:border-gray-700
">
      <div className="flex items-center gap-[33px]">
        {/* <div className="w-[300px] h-[110px] flex items-center justify-center">
          <img src="/logo.png" alt="TechieMaya" className="h-[110px] w-auto block" />
        </div> */}
        <div className="flex flex-col justify-center items-start">
          <div className="text-[#222B45] text-[20px] font-semibold leading-tight">
            {title || (
              <>
                Hello {displayName} <span role="img" aria-label="wave">👋</span>
              </>
            )}
          </div>
          <div className="text-[#8F9BB3] text-[15px] font-normal mt-0.5 leading-tight">
            {subtitle || greeting}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Notification Bell */}
        <div ref={notificationMenuRef} className="relative mr-2">
          <button
            onClick={() => setNotificationMenuOpen(!notificationMenuOpen)}
            className="relative p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-[#222B45]" />
            {totalUnread > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-[10px] font-semibold text-white bg-red-500 rounded-full">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </button>
          {notificationMenuOpen && (
            <div className="absolute right-0 top-full mt-2 z-[9999] w-80 rounded-lg border border-slate-200 bg-white shadow-2xl max-h-96 overflow-auto">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                {totalUnread > 0 && (
                  <p className="text-xs text-slate-500 mt-1">{totalUnread} unread</p>
                )}
              </div>
              {unreadNotifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  No new notifications
                </div>
              ) : (
                <div className="py-2">
                  {unreadNotifications.slice(0, 10).map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id, notification.conversationId)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {notification.senderName || 'New message'}
                          </p>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {notification.content || notification.message || 'New message received'}
                          </p>
                          {notification.timestamp && (
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {unreadNotifications.length > 10 && (
                <div className="p-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      router.push('/conversation');
                      setNotificationMenuOpen(false);
                    }}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div ref={menuRef} className="relative">
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md shadow-sm min-w-[180px] ml-2 cursor-pointer" onClick={handleMenuToggle}>
            {isHydrated && user?.avatar ? (
              <img src={user.avatar} className="w-[38px] h-[38px] rounded-full object-cover" alt="avatar" />
            ) : (
              <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center bg-indigo-500 text-white font-semibold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col items-start justify-center">
              <div className="text-[15px] text-[#222B45] font-semibold leading-tight">{displayName}</div>
              <div className="text-[12px] text-[#8F9BB3] leading-tight">{displayRole}</div>
            </div>
            <Button variant="ghost" size="icon" className="text-[#8F9BB3] h-6 w-6 pointer-events-none">
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>
          {menuOpen && (
            <div className="absolute right-2 top-full mt-2 z-[9999] w-48 rounded-lg border border-slate-200 bg-white shadow-2xl">
              <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors rounded-lg">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Header;