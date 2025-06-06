import React from 'react';
import { Card, Tabs, Typography } from 'antd';
import { DollarCircleOutlined, AppstoreOutlined } from '@ant-design/icons';
import ExpenseList from './ExpenseList';
import ExpenseCategoryManagement from './ExpenseCategoryManagement';

const { Title } = Typography;
const { TabPane } = Tabs;

const ExpensePage: React.FC = () => {
  return (
    <div>
        <Title level={2} style={{ marginBottom: 24 }}>Expense Tracker</Title>
        <Card>
            <Tabs defaultActiveKey="1">
                <TabPane
                    tab={
                        <span>
                            <DollarCircleOutlined />
                            Expenses
                        </span>
                    }
                    key="1"
                >
                    <ExpenseList />
                </TabPane>
                <TabPane
                    tab={
                        <span>
                            <AppstoreOutlined />
                            Categories
                        </span>
                    }
                    key="2"
                >
                    <ExpenseCategoryManagement />
                </TabPane>
            </Tabs>
        </Card>
    </div>
  );
};

export default ExpensePage;