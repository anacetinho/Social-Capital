import { motion } from 'framer-motion';
import { Box } from '@chakra-ui/react';

/**
 * FadeIn component with scroll-triggered animation
 * Provides smooth opacity and translateY transitions
 * 
 * Usage: <FadeIn><YourContent /></FadeIn>
 */
export const FadeIn = ({ 
  children, 
  delay = 0, 
  duration = 0.6,
  y = 20,
  ...props 
}) => {
  const MotionBox = motion(Box);

  return (
    <MotionBox
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration,
        delay,
        ease: [0.34, 1.56, 0.64, 1], // Spring-like easing
      }}
      {...props}
    >
      {children}
    </MotionBox>
  );
};

/**
 * SlideUp component for dramatic entrance animations
 * Uses larger translateY values for more expressive motion
 * 
 * Usage: <SlideUp><YourContent /></SlideUp>
 */
export const SlideUp = ({ 
  children, 
  delay = 0,
  duration = 0.8,
  y = 60,
  ...props 
}) => {
  const MotionBox = motion(Box);

  return (
    <MotionBox
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration,
        delay,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      {...props}
    >
      {children}
    </MotionBox>
  );
};

/**
 * StaggerContainer for sequential animations of child elements
 * Perfect for lists, grids, and card layouts
 * 
 * Usage:
 * <StaggerContainer>
 *   <StaggerItem>Item 1</StaggerItem>
 *   <StaggerItem>Item 2</StaggerItem>
 * </StaggerContainer>
 */
export const StaggerContainer = ({ 
  children,
  staggerDelay = 0.1,
  ...props 
}) => {
  const MotionBox = motion(Box);

  return (
    <MotionBox
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      {...props}
    >
      {children}
    </MotionBox>
  );
};

/**
 * StaggerItem - Individual item within StaggerContainer
 */
export const StaggerItem = ({ 
  children, 
  y = 20,
  duration = 0.6,
  ...props 
}) => {
  const MotionBox = motion(Box);

  return (
    <MotionBox
      variants={{
        hidden: { opacity: 0, y },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            duration,
            ease: [0.34, 1.56, 0.64, 1],
          },
        },
      }}
      {...props}
    >
      {children}
    </MotionBox>
  );
};

/**
 * ScaleIn component for zoom entrance animations
 * Great for cards, modals, and featured content
 * 
 * Usage: <ScaleIn><YourCard /></ScaleIn>
 */
export const ScaleIn = ({ 
  children, 
  delay = 0,
  duration = 0.5,
  scale = 0.9,
  ...props 
}) => {
  const MotionBox = motion(Box);

  return (
    <MotionBox
      initial={{ opacity: 0, scale }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration,
        delay,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      {...props}
    >
      {children}
    </MotionBox>
  );
};

/**
 * HoverCard component with interactive lift effect
 * Combines hover animations with entrance animations
 * 
 * Usage: <HoverCard><YourContent /></HoverCard>
 */
export const HoverCard = ({ 
  children,
  liftAmount = -8,
  ...props 
}) => {
  const MotionBox = motion(Box);

  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: liftAmount,
        transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
      }}
      whileTap={{ scale: 0.98 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.6,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      {...props}
    >
      {children}
    </MotionBox>
  );
};

/**
 * PageTransition for smooth page route transitions
 * Wrap entire page content
 * 
 * Usage: <PageTransition><YourPage /></PageTransition>
 */
export const PageTransition = ({ children, ...props }) => {
  const MotionBox = motion(Box);

  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      }}
      {...props}
    >
      {children}
    </MotionBox>
  );
};

/**
 * FadeInLeft for directional entrance from left
 */
export const FadeInLeft = ({ 
  children, 
  delay = 0,
  duration = 0.6,
  x = -40,
  ...props 
}) => {
  const MotionBox = motion(Box);

  return (
    <MotionBox
      initial={{ opacity: 0, x }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration,
        delay,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      {...props}
    >
      {children}
    </MotionBox>
  );
};

/**
 * FadeInRight for directional entrance from right
 */
export const FadeInRight = ({ 
  children, 
  delay = 0,
  duration = 0.6,
  x = 40,
  ...props 
}) => {
  const MotionBox = motion(Box);

  return (
    <MotionBox
      initial={{ opacity: 0, x }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration,
        delay,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      {...props}
    >
      {children}
    </MotionBox>
  );
};
