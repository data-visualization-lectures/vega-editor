import React from 'react';
import {useAppContext} from '../../context/app-context.js';
import {BACKEND_URL} from '../../constants/index.js';

type Props = {children?: React.ReactNode};

const LoginConditional: React.FC<Props> = ({children}) => {
  const {state} = useAppContext();
  const {isAuthenticated} = state;

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return null;
};

export default LoginConditional;
