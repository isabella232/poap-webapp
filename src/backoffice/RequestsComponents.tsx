import React from 'react';
import sortDown from '../images/sort-down.png';
import sortUp from '../images/sort-up.png';

type SortIconProps = {
  isSortedDesc?: boolean;
};

const SortIcon: React.FC<SortIconProps> = ({ isSortedDesc }) => {
  const icon = (): string => {
    return isSortedDesc ? sortDown : sortUp;
  };

  const alt = (): string => {
    return isSortedDesc ? 'down' : 'up';
  };

  return (isSortedDesc !== undefined && <img src={icon()} alt={alt()} className={'icon'} />) || <div />;
};

type ExpandedIconProps = {
  isExpanded?: boolean;
};

const ExpandedIcon: React.FC<ExpandedIconProps> = ({ isExpanded }) => {
  const icon = (): string => {
    return isExpanded ? sortDown : sortUp;
  };

  const alt = (): string => {
    return isExpanded ? 'down' : 'up';
  };

  return <img src={icon()} alt={alt()} className={'icon sm'} />;
};

export {
  ExpandedIcon,
  SortIcon
}