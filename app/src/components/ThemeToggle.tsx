import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-10 w-10"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun style={{ width: '20px', height: '20px' }} className="text-text-secondary hover:text-text-primary transition-colors" />
      ) : (
        <Moon style={{ width: '20px', height: '20px' }} className="text-text-secondary hover:text-text-primary transition-colors" />
      )}
    </Button>
  );
}