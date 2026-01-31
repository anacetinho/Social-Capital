import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Select,
  VStack,
  HStack,
  Avatar,
  Badge,
  Flex,
  Icon,
  Skeleton,
} from '@chakra-ui/react';
import {
  MdPeople,
  MdLink,
  MdEvent,
  MdStar,
  MdTrendingUp,
} from 'react-icons/md';
import {
  FadeIn,
  SlideUp,
  StaggerContainer,
  StaggerItem,
  HoverCard,
  ScaleIn,
} from '../components/animations';

const StatCard = ({ icon, label, value, helpText, color, isLoading }) => {
  return (
    <HoverCard>
      <Box
        bg="white"
        p={6}
        borderRadius="2xl"
        boxShadow="sm"
        position="relative"
        overflow="hidden"
      >
        {isLoading ? (
          <>
            <Skeleton height="60px" mb={2} />
            <Skeleton height="20px" width="60%" />
          </>
        ) : (
          <>
            <Box
              position="absolute"
              top={-2}
              right={-2}
              opacity={0.1}
              transform="rotate(15deg)"
            >
              <Icon as={icon} boxSize={20} color={color} />
            </Box>
            <Box position="relative">
              <Text fontSize="sm" fontWeight="semibold" color="gray.600">
                {label}
              </Text>
              <Text fontSize="4xl" fontWeight="bold" color={color} my={2}>
                {value}
              </Text>
              {helpText && (
                <Text fontSize="xs" color="gray.500">
                  {helpText}
                </Text>
              )}
            </Box>
          </>
        )}
      </Box>
    </HoverCard>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [people, setPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get the selected person object for context
  const selectedPerson = people.find(p => p.id === parseInt(selectedPersonId)) || null;

  const fetchPeople = useCallback(async () => {
    try {
      const response = await api.get('/people');
      setPeople(response.data.data || response.data);
    } catch (err) {
      console.error('Failed to load people');
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedPersonId ? { person_id: selectedPersonId } : {};
      const response = await api.get('/dashboard/stats', { params });
      setStats(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  }, [selectedPersonId]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (error) {
    return (
      <Layout currentPerson={selectedPerson}>
        <FadeIn>
          <Box
            bg="red.50"
            color="red.800"
            p={4}
            borderRadius="xl"
            borderLeft="4px solid"
            borderColor="red.500"
          >
            {error}
          </Box>
        </FadeIn>
      </Layout>
    );
  }

  return (
    <Layout currentPerson={selectedPerson}>
      <Box>
        {/* Header Section */}
        <FadeIn>
          <Flex justify="space-between" align="flex-start" mb={8}>
            <Box>
              <Heading
                size="2xl"
                mb={2}
                bgGradient="linear(to-r, brand.600, brand.400)"
                bgClip="text"
                letterSpacing="tight"
              >
                Dashboard
              </Heading>
              <Text color="neutral.600" fontSize="lg">
                {selectedPersonId && stats?.person
                  ? `Showing statistics for ${stats.person.name}`
                  : 'Overview of your social network'}
              </Text>
            </Box>

            <Box maxW="320px">
              <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={2}>
                Key Person
              </Text>
              <Select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                size="md"
              >
                <option value="">All People (Network Overview)</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </Box>
          </Flex>
        </FadeIn>

        {/* Stats Grid */}
        <StaggerContainer>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
            {selectedPersonId && stats?.degree_connections ? (
              <>
                <StaggerItem>
                  <StatCard
                    icon={MdPeople}
                    label="N1 (1st Degree)"
                    value={stats.degree_connections.n1}
                    color="brand.500"
                    isLoading={loading}
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    icon={MdLink}
                    label="N2 (N1 + 2nd Degree)"
                    value={stats.degree_connections.n2}
                    color="blue.500"
                    isLoading={loading}
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    icon={MdTrendingUp}
                    label="N3 (N1 + N2 + 3rd Degree)"
                    value={stats.degree_connections.n3}
                    color="purple.500"
                    isLoading={loading}
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    icon={MdStar}
                    label="Favors"
                    value={stats.total_favors || 0}
                    color="orange.500"
                    isLoading={loading}
                  />
                </StaggerItem>
              </>
            ) : (
              <>
                <StaggerItem>
                  <StatCard
                    icon={MdPeople}
                    label="People"
                    value={stats?.total_people || 0}
                    color="brand.500"
                    isLoading={loading}
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    icon={MdLink}
                    label="Relationships"
                    value={stats?.total_relationships || 0}
                    color="blue.500"
                    isLoading={loading}
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    icon={MdEvent}
                    label="Events"
                    value={stats?.total_events || 0}
                    color="purple.500"
                    isLoading={loading}
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    icon={MdStar}
                    label="Favors"
                    value={stats?.total_favors || 0}
                    color="orange.500"
                    isLoading={loading}
                  />
                </StaggerItem>
              </>
            )}
          </SimpleGrid>
        </StaggerContainer>

        {/* Network Health Score */}
        <SlideUp mb={8}>
          <Box
            bgGradient="linear(135deg, brand.500, brand.700)"
            p={8}
            borderRadius="2xl"
            color="white"
            boxShadow="elevated"
            position="relative"
            overflow="hidden"
          >
            {loading ? (
              <Skeleton height="120px" />
            ) : (
              <>
                <Box
                  position="absolute"
                  top={-10}
                  right={-10}
                  opacity={0.1}
                  transform="rotate(15deg)"
                >
                  <Icon as={MdTrendingUp} boxSize={40} />
                </Box>
                <Flex justify="space-between" align="center" position="relative">
                  <Box>
                    <Heading size="lg" mb={2}>
                      Network Health Score
                    </Heading>
                    <Text fontSize="sm" opacity={0.9}>
                      Based on activity, diversity, and engagement
                    </Text>
                  </Box>
                  <Box textAlign="right">
                    <Text fontSize="6xl" fontWeight="black" lineHeight="1">
                      {stats?.network_health_score || 0}
                    </Text>
                    <Text fontSize="2xl" opacity={0.8}>
                      / 100
                    </Text>
                  </Box>
                </Flex>
                <Box mt={6}>
                  <Box
                    position="relative"
                    height="8px"
                    borderRadius="full"
                    bg="whiteAlpha.300"
                    overflow="hidden"
                  >
                    <Box
                      position="absolute"
                      left={0}
                      top={0}
                      height="100%"
                      width={`${stats?.network_health_score || 0}%`}
                      bg="white"
                      borderRadius="full"
                      transition="all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
                    />
                  </Box>
                </Box>
              </>
            )}
          </Box>
        </SlideUp>

        {/* Relationship Strength Distribution */}
        <ScaleIn mb={8}>
          <Box bg="white" p={8} borderRadius="2xl" boxShadow="sm">
            <Heading size="md" mb={6}>
              Relationship Strength Distribution
            </Heading>
            {stats?.relationship_strength_distribution && !loading ? (
              <Flex gap={4} align="flex-end" h="250px">
                {[1, 2, 3, 4, 5].map((strength) => {
                  const count = stats.relationship_strength_distribution[strength] || 0;
                  const maxCount = Math.max(
                    ...Object.values(stats.relationship_strength_distribution || {}),
                    1
                  );
                  const heightPercent = (count / maxCount) * 100;
                  const colors = {
                    1: 'neutral.400',
                    2: 'blue.400',
                    3: 'orange.400',
                    4: 'orange.500',
                    5: 'red.500',
                  };
                  const labels = {
                    1: 'Weak',
                    2: 'Basic',
                    3: 'Good',
                    4: 'Strong',
                    5: 'Very Strong',
                  };

                  return (
                    <VStack key={strength} flex={1} h="full" justify="flex-end" spacing={2}>
                      <Text fontWeight="bold" fontSize="xl" color={colors[strength]}>
                        {count}
                      </Text>
                      <Box
                        w="full"
                        h={`${heightPercent}%`}
                        minH={count > 0 ? '20px' : 0}
                        bg={colors[strength]}
                        borderRadius="lg"
                        transition="all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
                        boxShadow="sm"
                      />
                      <VStack spacing={0}>
                        <Text fontSize="xs" fontWeight="semibold" color="neutral.600">
                          {labels[strength]}
                        </Text>
                        <Text fontSize="xs" color="neutral.400">
                          {strength}★
                        </Text>
                      </VStack>
                    </VStack>
                  );
                })}
              </Flex>
            ) : (
              <Skeleton height="250px" />
            )}
          </Box>
        </ScaleIn>

        {/* Most Connected People */}
        <FadeIn mb={8}>
          <Box bg="white" p={8} borderRadius="2xl" boxShadow="sm">
            <Heading size="md" mb={6}>
              Most Connected People
            </Heading>
            {stats?.top_connections && stats.top_connections.length > 0 && !loading ? (
              <VStack spacing={3} align="stretch">
                {stats.top_connections.slice(0, 5).map((person, index) => (
                  <HoverCard key={person.id}>
                    <Flex
                      align="center"
                      p={4}
                      borderRadius="xl"
                      bg={index === 0 ? 'orange.50' : 'neutral.50'}
                      border="2px solid"
                      borderColor={index === 0 ? 'orange.200' : 'neutral.100'}
                      transition="all 0.3s"
                    >
                      <Avatar
                        name={person.name}
                        bg={index === 0 ? 'orange.500' : 'brand.500'}
                        color="white"
                        size="md"
                        mr={4}
                      />
                      <Box flex={1}>
                        <Text fontWeight="semibold" fontSize="md">
                          {person.name}
                        </Text>
                        <Text fontSize="sm" color="neutral.600">
                          {person.connection_count}{' '}
                          {person.connection_count === 1 ? 'connection' : 'connections'}
                        </Text>
                      </Box>
                      {index === 0 && (
                        <Badge colorScheme="orange" fontSize="lg" px={3} py={1}>
                          👑 Top
                        </Badge>
                      )}
                      <Badge colorScheme="brand" ml={2}>
                        #{index + 1}
                      </Badge>
                    </Flex>
                  </HoverCard>
                ))}
              </VStack>
            ) : loading ? (
              <VStack spacing={3}>
                <Skeleton height="60px" />
                <Skeleton height="60px" />
                <Skeleton height="60px" />
              </VStack>
            ) : (
              <Text color="neutral.500">No connection data available</Text>
            )}
          </Box>
        </FadeIn>

        {/* Recent Events & Upcoming Birthdays */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <FadeIn>
            <Box bg="white" p={8} borderRadius="2xl" boxShadow="sm" h="full">
              <Heading size="md" mb={6}>
                Recent Events
              </Heading>
              {stats?.recent_events && stats.recent_events.length > 0 && !loading ? (
                <VStack spacing={3} align="stretch">
                  {stats.recent_events.slice(0, 5).map((event) => (
                    <Box
                      key={event.id}
                      p={3}
                      borderBottom="1px solid"
                      borderColor="neutral.100"
                      _last={{ borderBottom: 'none' }}
                      transition="all 0.2s"
                      _hover={{ bg: 'neutral.50', borderRadius: 'md' }}
                    >
                      <Text fontWeight="medium" mb={1}>
                        {event.title}
                      </Text>
                      <Text fontSize="sm" color="neutral.500">
                        {new Date(event.date).toLocaleDateString()}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              ) : loading ? (
                <VStack spacing={3} align="stretch">
                  <Skeleton height="20px" />
                  <Skeleton height="20px" />
                  <Skeleton height="20px" />
                  <Skeleton height="20px" />
                  <Skeleton height="20px" />
                </VStack>
              ) : (
                <Text color="neutral.500">No recent events</Text>
              )}
            </Box>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Box bg="white" p={8} borderRadius="2xl" boxShadow="sm" h="full">
              <Heading size="md" mb={6}>
                Upcoming Birthdays
              </Heading>
              {stats?.upcoming_birthdays && stats.upcoming_birthdays.length > 0 && !loading ? (
                <VStack spacing={3} align="stretch">
                  {stats.upcoming_birthdays.map((person) => (
                    <Box
                      key={person.id}
                      p={3}
                      borderBottom="1px solid"
                      borderColor="neutral.100"
                      _last={{ borderBottom: 'none' }}
                      transition="all 0.2s"
                      _hover={{ bg: 'neutral.50', borderRadius: 'md' }}
                    >
                      <HStack spacing={3}>
                        <Text fontSize="2xl">🎂</Text>
                        <Box>
                          <Text fontWeight="medium" mb={1}>
                            {person.name}
                          </Text>
                          <Text fontSize="sm" color="neutral.500">
                            {person.birthday
                              ? new Date(person.birthday).toLocaleDateString(undefined, {
                                  month: 'long',
                                  day: 'numeric',
                                })
                              : 'Date unknown'}
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              ) : loading ? (
                <VStack spacing={3} align="stretch">
                  <Skeleton height="20px" />
                  <Skeleton height="20px" />
                  <Skeleton height="20px" />
                  <Skeleton height="20px" />
                  <Skeleton height="20px" />
                </VStack>
              ) : (
                <Text color="neutral.500">No upcoming birthdays</Text>
              )}
            </Box>
          </FadeIn>
        </SimpleGrid>
      </Box>
    </Layout>
  );
};

export default Dashboard;
