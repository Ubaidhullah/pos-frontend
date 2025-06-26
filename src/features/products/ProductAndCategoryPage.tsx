import React from 'react';
import { Card, Tabs, Typography } from 'antd';
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import ProductListPage from './ProductListPage';
import CategoryListPage from '../categories/CategoryListPage';

const { Title } = Typography;
const { TabPane } = Tabs;

const ProductAndCategoryPage: React.FC = () => {
  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        Products & Categories
      </Title>
      <Card>
        <Tabs defaultActiveKey="1" type="card">
          <TabPane
            tab={
              <span>
                <AppstoreOutlined />
                Products
              </span>
            }
            key="1"
          >
            <ProductListPage />
          </TabPane>
          <TabPane
            tab={
              <span>
                <UnorderedListOutlined />
                Categories
              </span>
            }
            key="2"
          >
            <CategoryListPage />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default ProductAndCategoryPage;
