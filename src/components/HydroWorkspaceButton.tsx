import { Button } from '@mui/material';
import type { ButtonProps } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { hydroWorkspaceHref } from '../lib/hydro-workspace';

type Props = ButtonProps & {
  path: string;
  title?: string;
};

export default function HydroWorkspaceButton({ path, title, onClick, ...props }: Props) {
  const navigate = useNavigate();
  return (
    <Button
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) navigate(hydroWorkspaceHref(path, title));
      }}
    />
  );
}