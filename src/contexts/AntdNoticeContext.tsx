import React, { createContext, useContext, type ReactNode } from 'react';
import { App, message, notification } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';

interface AntdNoticeContextType {
  messageApi: MessageInstance;
  notificationApi: NotificationInstance;
}

const AntdNoticeContext = createContext<AntdNoticeContextType | undefined>(undefined);

// A helper component that initializes the context
export const AntdNoticeProvider = ({ children }: { children: ReactNode }) => {
  const { message, notification } = App.useApp();
  return (
    <AntdNoticeContext.Provider value={{ messageApi: message, notificationApi: notification }}>
      {children}
    </AntdNoticeContext.Provider>
  );
};

// A custom hook to easily access the context
export const useAntdNotice = () => {
  const context = useContext(AntdNoticeContext);
  if (context === undefined) {
    throw new Error('useAntdNotice must be used within an AntdNoticeProvider');
  }
  return context;
};