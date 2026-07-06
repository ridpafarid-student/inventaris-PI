import { useTheme } from '@/contexts/ThemeContext';
import logoDark from '@/assets/logo-mthree-darkmode.svg';
import logoLight from '@/assets/logo-mthree-lightmode.svg';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className, width = 160, height = 38 }: LogoProps) {
  const { theme } = useTheme();
  
  return (
    <img
      src={theme === 'dark' ? logoDark : logoLight}
      alt="MThree Computer"
      className={className}
      width={width}
      height={height}
    />
  );
}