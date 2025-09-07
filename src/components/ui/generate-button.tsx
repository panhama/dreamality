import { Sparkles } from 'lucide-react';
import React from 'react';
import styled from 'styled-components';

interface GenerateButtonProps {
  text?: string;
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const GenerateButton: React.FC<GenerateButtonProps> = ({
  text = "Generate",
  variant = 'default',
  size = 'medium',
  className = '',
  onClick,
  disabled = false,
  type = 'button'
}) => {
  return (
    <StyledButton
      className={className}
      onClick={onClick}
      variant={variant}
      size={size}
      disabled={disabled}
      type={type}
    >
      <span className="content">
        <Sparkles className="h-3 w-3 mr-1" />
        {text}
      </span>
    </StyledButton>
  );
}

interface StyledButtonProps {
  variant: string;
  size: string;
}

const StyledButton = styled.button<StyledButtonProps>`
  padding: ${({ size }) =>
    size === 'small' ? '0.3em 0.8em' :
    size === 'large' ? '0.7em 1.5em' :
    '0.5em 1em'
  };
  background: none;
  border: 2px solid #fff;
  font-size: ${({ size }) =>
    size === 'small' ? '12px' :
    size === 'large' ? '16px' :
    '14px'
  };
  color: #131313;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  border-radius: 8px;
  background-color: ${({ variant }) =>
    variant === 'bg-primary' ? '#4cc9f0' :
    variant === 'bg-secondary' ? '#ff6700' :
    '#ecd448'
  };
  font-weight: bolder;
  box-shadow: 0 1px 0 1px #000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: ${({ size }) =>
    size === 'small' ? '60px' :
    size === 'large' ? '120px' :
    '80px'
  };
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};

  .content {
   position: relative;
   z-index: 2;
   display: flex;
   align-items: center;
   justify-content: center;
   color: #131313;
   font-weight: bolder;
   white-space: nowrap;
  }

  &:before {
   content: "";
   position: absolute;
   width: ${({ size }) =>
     size === 'small' ? '40px' :
     size === 'large' ? '80px' :
     '60px'
   };
   height: 120%;
   background-color: ${({ variant }) =>
     variant === 'bg-primary' ? '#ff6700' :
     variant === 'bg-secondary' ? '#4cc9f0' :
     '#ff6700'
   };
   top: 50%;
   transform: skewX(30deg) translate(-150%, -50%);
   transition: all 0.5s;
   z-index: 1;
  }

  &:hover:not(:disabled) {
   background-color: ${({ variant }) =>
     variant === 'bg-primary' ? '#2a9fd6' :
     variant === 'bg-secondary' ? '#e55a00' :
     '#4cc9f0'
   };
   color: #fff;
   box-shadow: 0 1px 0 1px #0d3b66;
  }

  &:hover:not(:disabled) .content {
   color: #fff;
  }

  &:hover:not(:disabled)::before {
   transform: skewX(30deg) translate(150%, -50%);
   transition-delay: 0.1s;
  }

  &:active:not(:disabled) {
   transform: scale(0.9);
  }

  &:disabled {
   cursor: not-allowed;
   opacity: 0.5;
  }`;

export default GenerateButton;
