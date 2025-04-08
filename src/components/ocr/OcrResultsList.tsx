import React, { useState } from 'react';
import { Input } from 'antd';
import { useOcr } from '../../hooks/useOcr';
import { OcrStatus } from '../../types/ocr';
import { Card } from '../../components/common/Card';
import { Select } from '../../components/common/Select';
import { Pagination } from '../../components/common/Pagination';
import { OcrResult as OcrResultComponent } from './OcrResult';

// ... existing code ... 