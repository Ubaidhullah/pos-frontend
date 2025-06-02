import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Typography, Dropdown, Space, theme as antdTheme, Breadcrumb } from 'antd';
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
  PieChartOutlined
   // For breadcrumb
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../common/enums/role.enum'; // Your frontend Role enum
// You might create a dedicated CSS file for MainLayout for more extensive styling
// import './MainLayout.css';

const { Header, Content, Sider, Footer } = Layout;
const { Text } = Typography;
const { useToken } = antdTheme; // Ant Design v5 theme token hook

// Helper to create Menu items (same as before)
function getItem(label: React.ReactNode, key: string, icon?: React.ReactNode, children?: any[], type?: 'group') {
  return { key, icon, children, label, type };
}

// Breadcrumb generation helper (basic example)
const breadcrumbNameMap: Record<string, string> = {
  '/': 'Dashboard / POS',
  '/customers': 'Customers',
  '/orders': 'Orders',
  '/admin': 'Admin',
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
  const [currentSelectedKey, setCurrentSelectedKey] = useState(location.pathname);

  useEffect(() => {
    // Ensure the key correctly reflects nested routes if your menu keys are more granular
    // For example, if '/admin/products/new' should highlight '/admin/products' in menu
    const pathSnippets = location.pathname.split('/').filter(i => i);
    let activePath = `/${pathSnippets[0]}`;
    if (pathSnippets.length > 1 && (pathSnippets[0] === 'admin' || pathSnippets[0] === 'management')) {
        activePath = `/${pathSnippets[0]}/${pathSnippets[1]}`;
    } else if (pathSnippets.length === 0) {
        activePath = '/';
    }
    setCurrentSelectedKey(activePath);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    getItem('Logout', 'logout', <LogoutOutlined />),
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      handleLogout();
    }
  };

  const userMenu = (
    <Menu onClick={handleUserMenuClick} items={userMenuItems} />
  );

  const navItems = [];
  if (user) {
    navItems.push(getItem(<Link to="/">Dashboard</Link>, '/', <DashboardOutlined />));
    navItems.push(getItem(<Link to="/pos">Point of Sale</Link>, '/pos', </* some other icon */ ShoppingCartOutlined />));

    if (hasRole([Role.ADMIN, Role.MANAGER, Role.CASHIER])) {
      navItems.push(getItem(<Link to="/customers">Customers</Link>, '/customers', <SolutionOutlined />));
      navItems.push(getItem(<Link to="/orders">Orders</Link>, '/orders', <ShoppingOutlined />));
      navItems.push(getItem(<Link to="/reports">Reports</Link>, '/reports', <PieChartOutlined />));
    }
    if (hasRole([Role.ADMIN, Role.MANAGER])) {
      navItems.push(getItem('Products & Stock', '/admin/products_stock', <AppstoreOutlined />, [
        getItem(<Link to="/admin/products">Products</Link>, '/admin/products', <AppstoreOutlined />),
        getItem(<Link to="/admin/categories">Categories</Link>, '/admin/categories', <BarcodeOutlined />),
        getItem(<Link to="/admin/inventory">Inventory</Link>, '/admin/inventory', <ShoppingOutlined />),
        getItem(<Link to="/admin/suppliers">Suppliers</Link>, '/admin/suppliers', <SolutionOutlined />),
        getItem(<Link to="/admin/purchase-orders">Purchase Orders</Link>, '/admin/purchase-orders', <ShoppingOutlined />),
      ]));
    }
    if (hasRole([Role.ADMIN])) {
      navItems.push(getItem(<Link to="/admin/users">User Management</Link>, '/admin/users', <TeamOutlined />));
    }
  }

  // Generate Breadcrumb items
  const pathSnippets = location.pathname.split('/').filter(i => i);
  const extraBreadcrumbItems = pathSnippets.map((_, index) => {
    const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
    return (
      <Breadcrumb.Item key={url}>
        <Link to={url}>{breadcrumbNameMap[url] || pathSnippets[index]}</Link>
      </Breadcrumb.Item>
    );
  });
  const breadcrumbItems = [
    <Breadcrumb.Item key="home">
      <Link to="/"><HomeOutlined /></Link>
    </Breadcrumb.Item>,
  ].concat(extraBreadcrumbItems);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        // For a fixed sider, you might need additional CSS depending on the overall structure
        // style={{
        //   overflow: 'auto',
        //   height: '100vh',
        //   position: 'fixed',
        //   left: 0,
        //   top: 0,
        //   bottom: 0,
        // }}
        breakpoint="lg" // AntD's built-in breakpoint for Sider collapse
        collapsedWidth="80" // Or "0" to hide completely on mobile and use a Drawer
      >
        <div
          style={{
            height: '32px',
            margin: '16px',
            background: 'rgba(255, 255, 255, 0.2)',
            textAlign: 'center',
            lineHeight: '32px',
            color: 'white',
            borderRadius: '6px',
            fontWeight: 'bold',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {collapsed ? 'POS' : 'POS System'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[currentSelectedKey]}
          mode="inline"
          items={navItems}
        />
      </Sider>
      <Layout
        // className="site-layout" // Add a class for custom styling
        // style={{ marginLeft: collapsed ? 80 : 200 }} // Adjust if Sider is fixed
      >
        <Header
          style={{
            padding: '0 24px', // More padding
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${antdTheme.getDesignToken().colorBorderSecondary}`, // Subtle border
            // position: 'sticky', // For sticky header
            // top: 0,
            // zIndex: 10,
            // width: '100%', // if sticky
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
              color: colorTextBase,
            }}
          />
          <div style={{ flexGrow: 1, marginLeft: '20px' }}>
            {/* You could put a page title here, fetched from context or route */}
            {/* <Title level={4} style={{ margin: 0 }}>Page Title</Title> */}
          </div>
          {user && (
            <Space align="center">
              <Text strong>Welcome, {user.name || user.email}</Text>
              <Dropdown overlay={userMenu} trigger={['click']}>
                <Avatar style={{ backgroundColor: '#87d068', cursor: 'pointer' }} icon={<UserOutlined />} />
              </Dropdown>
            </Space>
          )}
        </Header>
        <Content
          style={{
            margin: '16px', // Consistent margin
            // padding: 24, // Moved to inner div for better control with background
            // minHeight: 280, // AntD default, adjust as needed
            overflow: 'initial', // Important for scroll within content
          }}
        >
          <Breadcrumb style={{ margin: '0 0 16px 0' }}>
            {breadcrumbItems}
          </Breadcrumb>
          <div
            style={{
              padding: 24,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              minHeight: 'calc(100vh - 64px - 32px - 69px - 58px)', // Adjust based on header/margin/footer heights
              // Example: 100vh - HeaderHeight - ContentMarginTopBottom - FooterHeight - BreadcrumbHeight
            }}
          >
            <Outlet /> {/* Your page content renders here */}
          </div>
        </Content>
        <Footer style={{ textAlign: 'center', background: '#f0f2f5', padding: '15px 50px' }}>
          POS System ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;