import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatFloatingButton from './ChatFloatingButton';
import ChatSidebar from './ChatSidebar';
import api from '../services/api';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Link,
  Button,
  Avatar,
  Heading,
  Icon,
  Separator,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import {
  MdDashboard,
  MdPeople,
  MdLink,
  MdEvent,
  MdFolder,
  MdHub,
  MdSettings,
  MdLogout,
} from 'react-icons/md';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

const NavItem = ({ to, icon, children, isActive }) => {
  return (
    <Link
      as={RouterLink}
      to={to}
      _hover={{ textDecoration: 'none' }}
      w="full"
    >
      <MotionBox
        whileHover={{ x: 4 }}
        transition={{ duration: 0.2 }}
      >
        <Flex
          align="center"
          px={4}
          py={3}
          borderRadius="lg"
          cursor="pointer"
          bg={isActive ? 'brand.500' : 'transparent'}
          color={isActive ? 'white' : 'neutral.300'}
          fontWeight={isActive ? 'semibold' : 'medium'}
          transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          _hover={{
            bg: isActive ? 'brand.600' : 'whiteAlpha.100',
            color: isActive ? 'white' : 'white',
          }}
        >
          <Icon as={icon} boxSize={5} mr={3} />
          <Text fontSize="sm">{children}</Text>
        </Flex>
      </MotionBox>
    </Link>
  );
};

const Layout = ({ children, currentPerson = null }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  const isActive = (path) => location.pathname === path;

  const bgColor = 'cream.100';
  const sidebarBg = 'neutral.800';

  // Check if AI assistant is enabled
  useEffect(() => {
    const checkAiStatus = async () => {
      try {
        const response = await api.get('/settings/ai');
        setAiEnabled(response.data.settings.ai_assistant_enabled);
      } catch (err) {
        console.error('Failed to check AI status:', err);
      }
    };

    checkAiStatus();
  }, []);

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Sidebar */}
      <MotionFlex
        as="nav"
        w="280px"
        bg={sidebarBg}
        color="white"
        flexDirection="column"
        p={6}
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        boxShadow="2xl"
      >
        {/* Logo/Header */}
        <MotionBox
          mb={8}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Heading
            size="lg"
            bgGradient="linear(to-r, brand.200, brand.400)"
            bgClip="text"
            mb={2}
            letterSpacing="tight"
          >
            Social Capital
          </Heading>
          <HStack spacing={3}>
            <Avatar size="xs" name={user?.email} bg="brand.500" />
            <Text fontSize="xs" color="neutral.400" noOfLines={1}>
              {user?.email}
            </Text>
          </HStack>
        </MotionBox>

        <Box borderBottom="1px solid" borderColor="whiteAlpha.200" mb={6} />

        {/* Navigation */}
        <VStack spacing={1} flex={1} align="stretch">
          <NavItem to="/dashboard" icon={MdDashboard} isActive={isActive('/dashboard')}>
            Dashboard
          </NavItem>
          <NavItem to="/people" icon={MdPeople} isActive={isActive('/people')}>
            People
          </NavItem>
          <NavItem to="/relationships" icon={MdLink} isActive={isActive('/relationships')}>
            Relationships
          </NavItem>
          <NavItem to="/interactions" icon={MdEvent} isActive={isActive('/interactions')}>
            Interactions
          </NavItem>
          <NavItem to="/assets" icon={MdFolder} isActive={isActive('/assets')}>
            Assets
          </NavItem>
          <NavItem to="/network" icon={MdHub} isActive={isActive('/network')}>
            Network Graph
          </NavItem>
        </VStack>

        <Separator borderColor="whiteAlpha.200" my={4} />

        {/* Footer Actions */}
        <VStack spacing={2} align="stretch">
          <NavItem to="/settings" icon={MdSettings} isActive={isActive('/settings')}>
            Settings
          </NavItem>
          
          <MotionBox whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={logout}
              leftIcon={<MdLogout />}
              variant="ghost"
              colorScheme="red"
              w="full"
              justifyContent="flex-start"
              size="sm"
              color="neutral.300"
              _hover={{ bg: 'red.500', color: 'white' }}
              transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            >
              Logout
            </Button>
          </MotionBox>
        </VStack>
      </MotionFlex>

      {/* Main Content */}
      <Box
        flex={1}
        bg={bgColor}
        overflowY="auto"
        position="relative"
      >
        <Box
          maxW="1400px"
          mx="auto"
          p={8}
        >
          {children}
        </Box>
      </Box>

      {/* AI Assistant Chat */}
      {aiEnabled && (
        <>
          <ChatFloatingButton
            onClick={() => setChatOpen(!chatOpen)}
            isOpen={chatOpen}
          />
          <ChatSidebar
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            currentPerson={currentPerson}
          />
        </>
      )}
    </Flex>
  );
};

export default Layout;
