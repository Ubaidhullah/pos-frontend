import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Menu, Button, Avatar, Typography, Dropdown, Space, theme as antdTheme, Breadcrumb
} from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  TeamOutlined,
  SolutionOutlined,
  BarcodeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  ShoppingCartOutlined,
  PieChartOutlined,
  UndoOutlined,
  IdcardOutlined,
  SettingOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';

const { Header, Content, Sider, Footer } = Layout;
const { Text } = Typography;
const { useToken } = antdTheme;

function getItem(label: React.ReactNode, key: string, icon?: React.ReactNode, children?: any[], type?: 'group') {
  const item: any = { key, icon, label, type };
  if (children && children.length > 0) {
    item.children = children;
  }
  return item;
}

const breadcrumbNameMap: Record<string, string> = {
  '/': 'Dashboard / POS',
  '/customers': 'Customers',
  '/orders': 'Orders',
  '/admin': 'Admin',
  '/expenses': "Expenses",
  '/admin/products': 'Products',
  '/admin/categories': 'Categories',
  '/admin/inventory': 'Inventory',
  '/admin/suppliers': 'Suppliers',
  '/admin/users': 'User Management',
  '/admin/purchase-orders': 'Purchase Orders',
};

const MainLayout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG, colorTextBase } } = useToken();

  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, onClick: handleLogout },
  ];

  const navItems: MenuProps['items'] = [];

  if (user) {
    navItems.push({ key: '/', icon: <DashboardOutlined />, label: <Link to="/">Dashboard</Link> });
    navItems.push({ key: '/pos', icon: <ShoppingCartOutlined />, label: <Link to="/pos">Point of Sale</Link> });

    if (hasRole([Role.ADMIN, Role.MANAGER, Role.CASHIER])) {
      navItems.push({ key: '/customers', icon: <SolutionOutlined />, label: <Link to="/customers">Customers</Link> });
      navItems.push({ key: '/orders', icon: <ShoppingOutlined />, label: <Link to="/orders">Orders</Link> });
      navItems.push({ key: '/reports', icon: <PieChartOutlined />, label: <Link to="/reports">Reports</Link> });
      navItems.push({ key: '/expenses', icon: <ShoppingOutlined />, label: <Link to="/expenses">Expenses</Link> });
      navItems.push({ key: '/returns', icon: <UndoOutlined />, label: <Link to="/returns">Process Return</Link> });
    }

    if (hasRole([Role.ADMIN, Role.MANAGER])) {
      navItems.push({
        key: '/admin/products_stock',
        icon: <AppstoreOutlined />,
        label: 'Products & Stock',
        children: [
          { key: '/admin/products', icon: <AppstoreOutlined />, label: <Link to="/admin/products">Products</Link> },
          { key: '/admin/categories', icon: <BarcodeOutlined />, label: <Link to="/admin/categories">Categories</Link> },
          { key: '/admin/inventory', icon: <ShoppingOutlined />, label: <Link to="/admin/inventory">Inventory</Link> },
          { key: '/admin/suppliers', icon: <SolutionOutlined />, label: <Link to="/admin/suppliers">Suppliers</Link> },
          { key: '/admin/purchase-orders', icon: <ShoppingOutlined />, label: <Link to="/admin/purchase-orders">Purchase Orders</Link> },
        ]
      });
    }

    if (hasRole([Role.ADMIN])) {
      navItems.push({
        key: '/admin/administration',
        icon: <SettingOutlined />,
        label: 'Administration',
        children: [
          { key: '/admin/users', icon: <TeamOutlined />, label: <Link to="/admin/users">User Management</Link> },
          { key: '/settings', icon: <UserOutlined />, label: <Link to="/settings">Settings</Link> },
          { key: '/taxes', icon: <IdcardOutlined />, label: <Link to="/taxes">Tax Rates</Link> },
          { key: '/admin/audit-log', icon: <FileSearchOutlined />, label: <Link to="/admin/audit-log">Audit Log</Link> },
        ]
      });
    }
  }

  const pathSnippets = location.pathname.split('/').filter(i => i);
  const extraBreadcrumbItems = pathSnippets.map((_, index) => {
    const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
    return {
      key: url,
      title: <Link to={url}>{breadcrumbNameMap[url] || pathSnippets[index]}</Link>,
    };
  });

  const breadcrumbItems = [
    { key: 'home', title: <Link to="/"><HomeOutlined /></Link> },
    ...extraBreadcrumbItems
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.2)', textAlign: 'center', lineHeight: '32px', color: 'white', borderRadius: '6px', fontWeight: 'bold', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {collapsed ? 'POS' : 'POS System'}
        </div>
        <Menu theme="dark" selectedKeys={[location.pathname]} mode="inline" items={navItems} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
          <Space align="center">
            <Text strong>{user?.name || user?.email}</Text>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Avatar style={{ cursor: 'pointer' }} icon={<UserOutlined />} />
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: '16px' }}>
          <Breadcrumb items={breadcrumbItems} style={{ margin: '0 0 16px 0' }} />
          <div style={{ padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG }}>
            <Outlet />
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>POS System ©{new Date().getFullYear()}</Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;