import React, { useEffect } from 'react';
import { Modal, Form, Select, Button, message, Spin } from 'antd';
import { useMutation } from '@apollo/client';
import { UPDATE_USER_ROLE } from '../../apollo/mutations/userMutations';
import { GET_USERS } from '../../apollo/queries/userQueries';
import { Role } from '../../common/enums/role.enum'; // Your frontend Role enum

const { Option } = Select;

interface UserData {
  id: string;
  email: string;
  name?: string;
  role: Role;
}

interface UpdateUserRoleModalProps {
  open: boolean;
  onClose: () => void;
  userToUpdate: UserData | null;
}

const UpdateUserRoleModal: React.FC<UpdateUserRoleModalProps> = ({ open, onClose, userToUpdate }) => {
  const [form] = Form.useForm<{ role: Role }>();

  const [updateUserRole, { loading: updateLoading }] = useMutation(UPDATE_USER_ROLE, {
    onCompleted: () => {
      message.success('User role updated successfully!');
      onClose(); // Close modal on success
    },
    onError: (error) => {
      message.error(`Failed to update role: ${error.message}`);
    },
    refetchQueries: [{ query: GET_USERS }], // Refetch user list after update
  });

  useEffect(() => {
    if (open && userToUpdate) {
      form.setFieldsValue({ role: userToUpdate.role });
    } else if (!open) {
        form.resetFields();
    }
  }, [open, userToUpdate, form]);

  const handleFinish = async (values: { role: Role }) => {
    if (!userToUpdate) {
      message.error('No user selected for update.');
      return;
    }
    updateUserRole({
      variables: {
        updateUserRoleInput: {
          userId: userToUpdate.id,
          newRole: values.role,
        },
      },
    });
  };

  const availableRoles = Object.values(Role); // Get all role values from your enum

  return (
    <Modal
      title={`Update Role for ${userToUpdate?.email || 'User'}`}
      open={open}
      onCancel={onClose}
      confirmLoading={updateLoading}
      footer={[
        <Button key="back" onClick={onClose} disabled={updateLoading}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={updateLoading} onClick={() => form.submit()}>
          Update Role
        </Button>,
      ]}
      destroyOnClose // Good practice to reset form state when modal is not visible
    >
      {userToUpdate ? ( // Only render form if userToUpdate is available
        <Form form={form} layout="vertical" name="updateUserRoleForm" onFinish={handleFinish}>
          <Form.Item label="User">
            <p>{userToUpdate.name || userToUpdate.email} (ID: {userToUpdate.id.substring(0,8)}...)</p>
          </Form.Item>
          <Form.Item
            name="role"
            label="New Role"
            rules={[{ required: true, message: 'Please select a new role!' }]}
          >
            <Select placeholder="Select a role">
              {availableRoles.map((roleValue) => (
                <Option key={roleValue} value={roleValue}>
                  {roleValue.charAt(0).toUpperCase() + roleValue.slice(1).toLowerCase()} {/* Nicer display */}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      ) : (
        <Spin tip="Loading user data..." /> // Show spinner if userToUpdate is null but modal is open (should ideally not happen with proper state management)
      )}
    </Modal>
  );
};

export default UpdateUserRoleModal;