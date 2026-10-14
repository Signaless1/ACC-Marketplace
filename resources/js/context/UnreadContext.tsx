import { createContext, useContext } from 'react';

/**
 * Live unread-message count. AppLayout keeps it fresh by polling
 * /messages/summary, so the sidebar and header badges update without
 * a page refresh.
 */
export const UnreadContext = createContext<number>(0);

export const useUnreadCount = () => useContext(UnreadContext);
