import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import { useWatchlist } from './WatchlistContext';

const NotificationContext = createContext(null);

const normalizeNotificationRecipients = (notification) => {
  if (Array.isArray(notification?.recipient_ids)) {
    return notification.recipient_ids.filter(Boolean).map((recipientId) => String(recipientId));
  }

  return [];
};

const normalizeNotifications = (notificationRows = [], readRows = [], currentUser = null, currentProfile = null) => {
  const readNotificationIds = new Set((readRows || []).map((entry) => entry.notification_id));
  const now = Date.now();

  return (notificationRows || [])
    .filter((notification) => {
      if (!notification) return false;
      const legacyExpiryBase = notification.sent_at || notification.created_at;
      const expiresAt = notification.expires_at
        ? new Date(notification.expires_at).getTime()
        : legacyExpiryBase ? new Date(legacyExpiryBase).getTime() + (3 * 24 * 60 * 60 * 1000) : null;
      if (expiresAt && expiresAt <= now) return false;
      if (currentProfile?.role === 'admin') {
        return true;
      }
      if (notification.status === 'draft') {
        return false;
      }

      const recipientScope = notification.recipient_scope || 'all_users';
      const recipientIds = normalizeNotificationRecipients(notification);
      const isScheduledAndNotLive = notification.status === 'scheduled'
        && notification.scheduled_for
        && new Date(notification.scheduled_for).getTime() > Date.now();

      if (isScheduledAndNotLive) {
        return false;
      }

      if (recipientScope === 'all_users') {
        return true;
      }

      if (recipientScope === 'all_admins') {
        return currentProfile?.role === 'admin';
      }

      if (recipientScope === 'specific_users' || recipientScope === 'multiple_users') {
        return currentUser ? recipientIds.includes(currentUser.id) : false;
      }

      return true;
    })
    .map((notification) => ({
      ...notification,
      type: notification.type || 'general',
      priority: notification.priority || 'normal',
      recipient_scope: notification.recipient_scope || 'all_users',
      recipient_ids: normalizeNotificationRecipients(notification),
      isRead: readNotificationIds.has(notification.id),
    }));
};

export const NotificationProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const { setToastMessage } = useWatchlist();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshNotifications = async () => {
    if (!user || !supabase) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [{ data: notificationRows = [], error: notificationsError }, { data: readRows = [], error: readsError }] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id),
    ]);

    if (notificationsError) {
      console.error('Failed to load notifications:', notificationsError);
    }

    if (readsError) {
      console.error('Failed to load notification reads:', readsError);
    }

    const nextNotifications = normalizeNotifications(notificationRows, readRows, user, profile);
    setNotifications(nextNotifications);
    setUnreadCount(nextNotifications.filter((notification) => !notification.isRead).length);
    setLoading(false);
  };

  useEffect(() => {
    if (!user || !supabase) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadNotifications = async () => {
      setLoading(true);

      const [{ data: notificationRows = [], error: notificationsError }, { data: readRows = [], error: readsError }] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', user.id),
      ]);

      if (cancelled) {
        return;
      }

      if (notificationsError) {
        console.error('Failed to load notifications:', notificationsError);
      }

      if (readsError) {
        console.error('Failed to load notification reads:', readsError);
      }

      const nextNotifications = normalizeNotifications(notificationRows, readRows, user, profile);
      setNotifications(nextNotifications);
      setUnreadCount(nextNotifications.filter((notification) => !notification.isRead).length);
      setLoading(false);
    };

    void loadNotifications();

    const channel = supabase.channel('notifications-stream');

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotification = {
            ...payload.new,
            type: payload.new?.type || 'general',
            priority: payload.new?.priority || 'normal',
            recipient_scope: payload.new?.recipient_scope || 'all_users',
            recipient_ids: normalizeNotificationRecipients(payload.new),
            isRead: false,
          };

          if (profile?.role !== 'admin' && newNotification.status === 'draft') {
            return;
          }

          const isVisibleToUser = profile?.role === 'admin'
            || newNotification.recipient_scope === 'all_users'
            || (newNotification.recipient_scope === 'all_admins' && profile?.role === 'admin')
            || (newNotification.recipient_scope === 'specific_users' || newNotification.recipient_scope === 'multiple_users')
              && newNotification.recipient_ids.includes(user.id);

          if (profile?.role !== 'admin' && !isVisibleToUser) {
            return;
          }

          setNotifications((currentNotifications) => {
            const alreadyExists = currentNotifications.some((item) => item.id === newNotification.id);
            if (alreadyExists) {
              return currentNotifications.map((item) => (item.id === newNotification.id ? newNotification : item));
            }

            const nextNotifications = [newNotification, ...currentNotifications].slice(0, 200);
            setUnreadCount(nextNotifications.filter((notification) => !notification.isRead).length);
            return nextNotifications;
          });

          if (setToastMessage) {
            setToastMessage({
              text: `New notification: ${newNotification.title || 'Announcement'}`,
              type: 'info',
              id: Date.now(),
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          const updatedNotification = {
            ...payload.new,
            type: payload.new?.type || 'general',
            priority: payload.new?.priority || 'normal',
            recipient_scope: payload.new?.recipient_scope || 'all_users',
            recipient_ids: normalizeNotificationRecipients(payload.new),
            isRead: false,
          };

          if (profile?.role !== 'admin' && updatedNotification.status === 'draft') {
            setNotifications((currentNotifications) => {
              const nextNotifications = currentNotifications.filter((notification) => notification.id !== updatedNotification.id);
              setUnreadCount(nextNotifications.filter((notification) => !notification.isRead).length);
              return nextNotifications;
            });
            return;
          }

          setNotifications((currentNotifications) => {
            const nextNotifications = currentNotifications.map((notification) => (
              notification.id === updatedNotification.id ? { ...notification, ...updatedNotification } : notification
            ));
            setUnreadCount(nextNotifications.filter((notification) => !notification.isRead).length);
            return nextNotifications;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => {
          const deletedNotificationId = payload.old?.id;

          if (!deletedNotificationId) {
            return;
          }

          setNotifications((currentNotifications) => {
            const nextNotifications = currentNotifications.filter((notification) => notification.id !== deletedNotificationId);
            setUnreadCount(nextNotifications.filter((notification) => !notification.isRead).length);
            return nextNotifications;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, profile, setToastMessage]);

  const markNotificationAsRead = async (notificationId) => {
    if (!user || !supabase) {
      return false;
    }

    const alreadyRead = notifications.some((notification) => notification.id === notificationId && notification.isRead);

    if (alreadyRead) {
      return true;
    }

    const { error } = await supabase
      .from('notification_reads')
      .upsert(
        {
          notification_id: notificationId,
          user_id: user.id,
          read_at: new Date().toISOString(),
        },
        { onConflict: 'notification_id,user_id' }
      );

    if (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }

    setNotifications((currentNotifications) => currentNotifications.map((notification) => (
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    )));

    setUnreadCount((count) => Math.max(0, count - 1));

    return true;
  };

  const markAllAsRead = async () => {
    if (!user || !supabase) {
      return false;
    }

    const unreadNotifications = notifications.filter((notification) => !notification.isRead);

    if (unreadNotifications.length === 0) {
      return false;
    }

    const rows = unreadNotifications.map((notification) => ({
      notification_id: notification.id,
      user_id: user.id,
      read_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('notification_reads')
      .upsert(rows, { onConflict: 'notification_id,user_id' });

    if (error) {
      console.error('Failed to mark notifications as read:', error);
      return false;
    }

    setNotifications((currentNotifications) => currentNotifications.map((notification) => ({
      ...notification,
      isRead: true,
    })));
    setUnreadCount(0);

    return true;
  };

  const sendNotification = async ({
    title,
    message,
    body,
    type,
    priority,
    recipientScope,
    recipientIds,
    movieId,
    imageUrl,
    scheduledFor,
    expiresInDays,
    status,
  }) => {
    if (!user || !supabase) {
      throw new Error('You must be signed in to send a notification.');
    }

    if (profile?.role !== 'admin') {
      throw new Error('Only admins can send notifications.');
    }

    const cleanTitle = title?.trim();
    const cleanMessage = (message ?? body ?? '').trim();

    if (!cleanTitle || !cleanMessage) {
      throw new Error('Notification title and message are required.');
    }

    const nextRecipientScope = recipientScope || 'all_users';
    const nextRecipientIds = Array.isArray(recipientIds)
      ? recipientIds.filter(Boolean).map((recipientId) => String(recipientId))
      : [];

    const nextScheduledFor = scheduledFor ? new Date(scheduledFor).toISOString() : null;
    const nextStatus = status === 'draft' ? 'draft' : nextScheduledFor ? 'scheduled' : 'sent';
    const nextSentAt = nextStatus === 'sent' ? new Date().toISOString() : null;
    const expiryBase = nextScheduledFor ? new Date(nextScheduledFor) : new Date();
    const nextExpiresAt = expiresInDays === 'never'
      ? null
      : new Date(expiryBase.getTime() + (Number(expiresInDays || 3) * 24 * 60 * 60 * 1000)).toISOString();
    const nextDeliveryStatus = nextStatus === 'draft' ? 'draft' : nextStatus === 'scheduled' ? 'scheduled' : 'sent';

    const payload = {
      title: cleanTitle,
      message: cleanMessage,
      body: cleanMessage,
      type: type || 'general',
      priority: priority || 'normal',
      recipient_scope: nextRecipientScope,
      recipient_ids: nextRecipientIds,
      movie_id: movieId || null,
      image_url: imageUrl || null,
      status: nextStatus,
      scheduled_for: nextScheduledFor,
      expires_at: nextExpiresAt,
      sent_at: nextSentAt,
      delivery_status: nextDeliveryStatus,
      created_by: user.id,
    };

    try {
      const { error } = await supabase
        .from('notifications')
        .insert(payload);

      if (error) {
        throw error;
      }
    } catch (error) {
      if (error?.message?.includes('expires_at')) {
        const legacyCompatiblePayload = { ...payload };
        delete legacyCompatiblePayload.expires_at;
        const { error: retryError } = await supabase
          .from('notifications')
          .insert(legacyCompatiblePayload);
        if (retryError) throw retryError;
      } else if (error?.message?.includes('recipient_ids') || error?.message?.includes('recipient_scope') || error?.message?.includes('priority') || error?.message?.includes('type') || error?.message?.includes('delivery_status') || error?.message?.includes('movie_id') || error?.message?.includes('scheduled_for')) {
        const fallbackPayload = {
          title: cleanTitle,
          message: cleanMessage,
          body: cleanMessage,
          created_by: user.id,
        };

        const { error: fallbackError } = await supabase
          .from('notifications')
          .insert(fallbackPayload);

        if (fallbackError) {
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }

    return true;
  };

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refreshNotifications,
      markNotificationAsRead,
      markAllAsRead,
      sendNotification,
    }),
    [notifications, unreadCount, loading, refreshNotifications, markNotificationAsRead, markAllAsRead, sendNotification]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }

  return context;
};
