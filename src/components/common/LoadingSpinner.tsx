import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingSpinnerProps {
  size?: number;
  tip?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 24, tip }) => {
  const antIcon = <LoadingOutlined style={{ fontSize: size }} spin />;
  
  return <Spin indicator={antIcon} tip={tip} />;
}; 