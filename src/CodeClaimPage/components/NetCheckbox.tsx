import React from 'react';
import { FiCheckSquare, FiSquare, FiHelpCircle } from 'react-icons/fi';
import { Tooltip } from 'react-lightweight-tooltip';
import { COLORS } from 'lib/constants';

const NetCheckbox: React.FC<{
  checked: boolean;
  children: string;
  tooltipContent: [React.ReactNode];
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}> = ({ checked, children, tooltipContent, onClick }) => {
  let CheckboxIcon = checked ? FiCheckSquare : FiSquare;
  return (
    <div>
      <span onClick={onClick}>
        <CheckboxIcon /> {children}
      </span>{' '}
      <Tooltip content={tooltipContent}>
        <FiHelpCircle color={COLORS.primaryColor} />
      </Tooltip>
    </div>
  );
};

export default NetCheckbox;
