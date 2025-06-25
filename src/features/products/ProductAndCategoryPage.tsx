import React from 'react';
import { Card, Tabs, Typography } from 'antd';
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import ProductListPage from './ProductListPage'; // Assuming this is the path
import CategoryListPage from '../categories/CategoryListPage'; // Assuming this is the path

const { Title } = Typography;
const { TabPane } = Tabs;

const ProductAndCategoryPage: React.FC = () => {
  return (
    <div>      
        <Card>
        <Tabs defaultActiveKey="1">
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
