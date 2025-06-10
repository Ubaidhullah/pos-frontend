import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'
import { ConfigProvider, App as AntApp } from 'antd';
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ConfigProvider /* theme props, locale, etc. */>
    <AntApp>
      <App />
    </AntApp>
  </ConfigProvider>
);
