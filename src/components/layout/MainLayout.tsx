import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Menu, Button, Avatar, Typography, Dropdown, Space, theme as antdTheme, Breadcrumb, Drawer, Grid
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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  ShoppingCartOutlined,
  PieChartOutlined,
  UndoOutlined,
  IdcardOutlined,
  SettingOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  LineChartOutlined,
  ContainerOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum';

const { Header, Content, Sider, Footer } = Layout;
const { Text } = Typography;
const { useToken } = antdTheme;
const { useBreakpoint } = Grid;

function getItem(label: React.ReactNode, key: string, icon?: React.ReactNode, children?: any[], type?: 'group') {
  const item: any = { key, icon, label, type };
  if (children && children.length > 0) {
    item.children = children;
  }
  return item;
}

const breadcrumbNameMap: Record<string, string> = {
  '/': 'Dashboard / POS',
  '/pos': 'Point of Sale',
  '/customers': 'Customers',
  '/orders': 'Orders',
  '/expenses': "Expenses",
  '/returns': 'Returns',
  '/reports': 'Reports',
  '/analytics': 'Analytics',
  '/quotations': 'Quotations',
  '/taxes': 'Tax Rates',
  '/settings': 'Settings',
  '/admin': 'Admin',
  '/admin/products': 'Products',
  '/admin/productspage': 'Products & Categories',
  '/admin/categories': 'Categories',
  '/admin/inventory': 'Inventory',
  '/admin/suppliers': 'Suppliers',
  '/admin/users': 'User Management',
  '/admin/purchase-orders': 'Purchase Orders',
  '/admin/audit-log': 'Audit Log',
};

const MainLayout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG } } = useToken();
  const screens = useBreakpoint();

  const [collapsed, setCollapsed] = useState(false);
  // State for the mobile drawer
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    // Automatically close the drawer when navigating on mobile
    if (drawerVisible) {
      setDrawerVisible(false);
    }
  }, [location]);

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
      navItems.push(getItem(<Link to="/quotations">Quotations</Link>, '/quotations', <FileTextOutlined />));
      navItems.push({ key: '/customers', icon: <SolutionOutlined />, label: <Link to="/customers">Customers</Link> });
      navItems.push({ key: '/orders', icon: <ShoppingOutlined />, label: <Link to="/orders">Orders</Link> });
      navItems.push({ key: '/expenses', icon: <PieChartOutlined />, label: <Link to="/expenses">Expenses</Link> });
      navItems.push({ key: '/returns', icon: <UndoOutlined />, label: <Link to="/returns">Process Return</Link> });
      navItems.push(getItem(<Link to="/reports">Reports</Link>, '/reports', <ContainerOutlined />));
      navItems.push({ key: '/analytics', icon: <LineChartOutlined />, label: <Link to="/analytics">Analytics</Link> });
      navItems.push({ key: '/deliveries', icon: <TruckOutlined />, label: <Link to="/deliveries">Delivery Run</Link> });
    }

    if (hasRole([Role.ADMIN, Role.MANAGER])) {
      navItems.push({
        key: '/admin/products_stock',
        icon: <AppstoreOutlined />,
        label: 'Products & Stock',
        children: [
          { key: '/admin/productspage', icon: <AppstoreOutlined />, label: <Link to="/admin/productspage">Products</Link> },
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
    const name = breadcrumbNameMap[url] || pathSnippets[index].charAt(0).toUpperCase() + pathSnippets[index].slice(1);
    return {
      key: url,
      title: <Link to={url}>{name}</Link>,
    };
  });

  const breadcrumbItems = [
    { key: 'home', title: <Link to="/"><HomeOutlined /></Link> },
    ...extraBreadcrumbItems
  ];
  
  const menuContent = (
    <>
      <div style={{ height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.2)', textAlign: 'center', lineHeight: '32px', color: 'white', borderRadius: '6px', fontWeight: 'bold', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        SwellPos
      </div>
      <Menu theme="dark" selectedKeys={[location.pathname]} mode="inline" items={navItems} />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sider for Desktop */}
      {screens.lg ? (
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} trigger={null} theme="dark">
            {menuContent}
        </Sider>
      ) : (
        // Drawer for Mobile/Tablet
        <Drawer
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          bodyStyle={{ padding: 0 }}
          width={250}
        >
          {menuContent}
        </Drawer>
      )}

      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Button
            type="text"
            icon={screens.lg ? (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />) : <MenuUnfoldOutlined />}
            onClick={() => screens.lg ? setCollapsed(!collapsed) : setDrawerVisible(!drawerVisible)}
          />
          <Space align="center">
            {screens.md && <Text strong>{user?.name || user?.email}</Text>}
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Avatar style={{ cursor: 'pointer', backgroundColor: '#1890ff' }} icon={<UserOutlined />} />
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: '0 16px' }}>
          <Breadcrumb items={breadcrumbItems} style={{ margin: '16px 0' }} />
          <div style={{ padding: screens.md ? 24 : 12, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 'calc(100vh - 180px)' }}>
            <Outlet />
          </div>
        </Content>
        <Footer style={{ textAlign: 'center', padding: '12px 24px' }}>SwellPos ©{new Date().getFullYear()}</Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
