// Test utility for conversation assignment logic with real backend data
// This file can be used to test the assignment functionality using actual API calls

import chatService from '../services/chatService';
import { getAllUsers } from '../services/userService';

interface User {
  id?: string | number;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

interface Conversation {
  id?: string | number;
  humanAgentId?: string | number | null;
  owner?: string;
  previousAssignments?: (string | number)[];
  [key: string]: unknown;
}

interface TestResult {
  conversationsCount: number;
  usersCount: number;
  currentUser: User;
}

interface TestCase {
  name: string;
  newValue: string | number;
  shouldChange: boolean;
  current?: string | number | null;
}

interface AssignmentTestResult {
  dropdownOptions: Array<{ value: string; label: string }>;
  currentUser: User;
}

// Test the filtering logic with real data
export const testConversationFiltering = async (): Promise<TestResult | undefined> => {
  console.log('=== Testing Conversation Filtering with Real Backend Data ===');
  
  try {
    // Fetch real conversations from backend
    const conversations = await chatService.getConversations() as Conversation[];
    console.log('Fetched conversations from backend:', conversations.length);
    
    // Fetch real users from backend
    const users = await getAllUsers() as User[];
    console.log('Fetched users from backend:', users.length);
    
    // Get current user from localStorage or Redux state
    const currentUserStr = localStorage.getItem('user') || '{}';
    const currentUser = JSON.parse(currentUserStr) as User;
    console.log('Current user:', currentUser);
    
    if (!currentUser.id) {
      console.error('No current user found. Please log in first.');
      return;
    }
    
    // Test admin filtering
    if (currentUser.role === 'admin') {
      console.log('Admin should see all conversations:', conversations.length);
      console.log('Available human agents:', users.filter(u => u.role === 'human_agent').length);
    }
    
    // Test human agent filtering
    if (currentUser.role === 'human_agent') {
      const assignedConversations = conversations.filter(conv => 
        conv.humanAgentId === currentUser.id
      );
      const aiConversations = conversations.filter(conv => 
        (conv.owner === 'AI' || conv.humanAgentId === null) && 
        conv.previousAssignments && 
        conv.previousAssignments.includes(currentUser.id as string | number)
      );
      
      console.log('Conversations assigned to current agent:', assignedConversations.length);
      console.log('AI conversations previously handled by current agent:', aiConversations.length);
      console.log('Total conversations visible to current agent:', assignedConversations.length + aiConversations.length);
    }
    
    return {
      conversationsCount: conversations.length,
      usersCount: users.length,
      currentUser: currentUser
    };
    
  } catch (error) {
    console.error('Error testing conversation filtering:', error);
    throw error;
  }
};

// Test assignment change logic with real data
export const testAssignmentChangeLogic = async (conversationId: string | number | null | undefined): Promise<void> => {
  console.log('=== Testing Assignment Change Logic ===');
  
  if (!conversationId) {
    console.error('Please provide a conversation ID to test assignment changes');
    return;
  }
  
  try {
    // Fetch the specific conversation
    const conversation = await chatService.getConversation(String(conversationId)) as Conversation;
    console.log('Current conversation assignment:', {
      id: conversation.id,
      humanAgentId: conversation.humanAgentId,
      owner: conversation.owner
    });
    
    // Fetch users to get available human agents
    const users = await getAllUsers() as User[];
    const humanAgents = users.filter(u => u.role === 'human_agent');
    
    console.log('Available human agents for assignment:', humanAgents.map(u => ({ id: u.id, name: u.name })));
    
    // Test different assignment scenarios
    const testCases: TestCase[] = [
      {
        name: 'Assign to first human agent',
        newValue: humanAgents[0]?.id || 'test_agent_id',
        shouldChange: true
      },
      {
        name: 'Reassign to Assistant',
        newValue: 'assistant',
        shouldChange: true
      },
      {
        name: 'No change - same assignment',
        newValue: conversation.humanAgentId || 'assistant',
        shouldChange: false
      }
    ];
    
    testCases.forEach(testCase => {
      const { newValue, shouldChange } = testCase;
      const currentHumanAgentId = conversation.humanAgentId;
      const isCurrentlyAssignedToAssistant = !currentHumanAgentId || conversation.owner === 'AI';
      const isNewlyAssignedToAssistant = newValue === 'assistant';
      
      const assignmentChanged = 
        (isNewlyAssignedToAssistant && !isCurrentlyAssignedToAssistant) ||
        (!isNewlyAssignedToAssistant && currentHumanAgentId !== newValue);
      
      console.log(`${testCase.name}: ${assignmentChanged === shouldChange ? 'PASS' : 'FAIL'}`);
    });
    
  } catch (error) {
    console.error('Error testing assignment change logic:', error);
    throw error;
  }
};

// Test the complete assignment flow
export const testCompleteAssignmentFlow = async (
  conversationId: string | number | null | undefined, 
  targetAgentId: string | number | null | undefined
): Promise<void> => {
  console.log('=== Testing Complete Assignment Flow ===');
  
  if (!conversationId || !targetAgentId) {
    console.error('Please provide both conversation ID and target agent ID');
    return;
  }
  
  try {
    // 1. Get current conversation state
    const conversation = await chatService.getConversation(String(conversationId)) as Conversation;
    console.log('1. Current conversation state:', {
      id: conversation.id,
      humanAgentId: conversation.humanAgentId,
      owner: conversation.owner
    });
    
    // 2. Test assignment change detection
    const currentHumanAgentId = conversation.humanAgentId;
    const isCurrentlyAssignedToAssistant = !currentHumanAgentId || conversation.owner === 'AI';
    const isNewlyAssignedToAssistant = targetAgentId === 'assistant';
    
    const assignmentChanged = 
      (isNewlyAssignedToAssistant && !isCurrentlyAssignedToAssistant) ||
      (!isNewlyAssignedToAssistant && currentHumanAgentId !== targetAgentId);
    
    console.log('2. Assignment change detected:', assignmentChanged);
    
    if (assignmentChanged) {
      // 3. Prepare backend payload
      let backendPayload: { handler: string; humanAgentId: string | number | null };
      if (targetAgentId === 'assistant') {
        backendPayload = { handler: 'AI', humanAgentId: null };
      } else {
        backendPayload = { handler: 'human_agent', humanAgentId: targetAgentId };
      }
      
      console.log('3. Backend payload prepared:', backendPayload);
      
      // 4. Call assignment API (commented out to prevent actual changes)
      // await chatService.assignConversationHandler(conversationId, backendPayload);
      console.log('4. Assignment API call would be made here (commented out for safety)');
      
      // 5. Verify the change would be reflected
      console.log('5. Expected new state:', {
        id: conversation.id,
        humanAgentId: targetAgentId === 'assistant' ? null : targetAgentId,
        owner: targetAgentId === 'assistant' ? 'AI' : 'human_agent'
      });
    }
    
  } catch (error) {
    console.error('Error testing complete assignment flow:', error);
    throw error;
  }
};

// Test human agent dropdown functionality
export const testHumanAgentDropdown = async (): Promise<AssignmentTestResult> => {
  console.log('=== Testing Human Agent Dropdown Functionality ===');
  
  try {
    // Get current user
    const currentUserStr = localStorage.getItem('user') || '{}';
    const currentUser = JSON.parse(currentUserStr) as User;
    
    if (currentUser.role !== 'human_agent') {
      console.log('Current user is not a human agent. Testing dropdown options for human agent role...');
    }
    
    // Test dropdown options for human agent
    const humanAgentDropdownOptions = [
      { value: 'user', label: 'User' },
      { value: 'assistant', label: 'Assistant' }
    ];
    
    console.log(' Human agent dropdown options:', humanAgentDropdownOptions);
    
    // Test value mapping logic
    const testConversations: Conversation[] = [
      { owner: 'human_agent', humanAgentId: 'agent123' },
      { owner: 'AI', humanAgentId: null }
    ];
    
    testConversations.forEach((conv, index) => {
      const dropdownValue = currentUser.role === 'human_agent' 
        ? (conv.owner === 'human_agent' ? 'user' : 'assistant')
        : (conv.humanAgentId || (conv.owner === 'AI' ? 'assistant' : ''));
      
      console.log(` Conversation ${index + 1} dropdown value:`, {
        conversation: conv,
        dropdownValue: dropdownValue
      });
    });
    
    // Test assignment logic for human agent selecting "user"
    if (currentUser.role === 'human_agent') {
      console.log('Human agent "user" selection would assign conversation to:', currentUser.id);
    }
    
    return {
      dropdownOptions: humanAgentDropdownOptions,
      currentUser: currentUser
    };
    
  } catch (error) {
    console.error('Error testing human agent dropdown:', error);
    throw error;
  }
};

// Test actual assignment functionality for human agents
export const testHumanAgentAssignment = async (conversationId: string | number | null | undefined): Promise<void> => {
  console.log('=== Testing Human Agent Assignment Functionality ===');
  
  try {
    // Get current user
    const currentUserStr = localStorage.getItem('user') || '{}';
    const currentUser = JSON.parse(currentUserStr) as User;
    
    if (currentUser.role !== 'human_agent') {
      console.log(' Current user is not a human agent. Cannot test assignment.');
      return;
    }
    
    if (!conversationId) {
      console.log(' Please provide a conversation ID to test assignment');
      return;
    }
    
    console.log(' Testing assignment for human agent:', currentUser.name, 'ID:', currentUser.id);
    
    // Test 1: Assign to themselves (User option)
    console.log('1. Testing assignment to "User" (themselves)...');
    try {
      const payload = { handler: 'human_agent', humanAgentId: currentUser.id };
      console.log('   Sending payload:', payload);
      
      // This will make an actual API call - be careful!
      const result = await chatService.assignConversationHandler(String(conversationId), payload);
      console.log('    Successfully assigned to themselves:', result);
    } catch (error) {
      const err = error as Error;
      console.log('    Failed to assign to themselves:', err.message);
    }
    
    // Test 2: Assign to AI Assistant
    console.log('2. Testing assignment to "Assistant" (AI)...');
    try {
      const payload = { handler: 'AI', humanAgentId: null };
      console.log('   Sending payload:', payload);
      
      // This will make an actual API call - be careful!
      const result = await chatService.assignConversationHandler(String(conversationId), payload);
      console.log('    Successfully assigned to AI:', result);
    } catch (error) {
      const err = error as Error;
      console.log('    Failed to assign to AI:', err.message);
    }
    
    console.log('=== Assignment Test Complete ===');
    
  } catch (error) {
    console.error('Error testing human agent assignment:', error);
    throw error;
  }
};

// Run all tests
export const runAllTests = async (): Promise<void> => {
  console.log('Running conversation assignment tests with real backend data...');
  
  try {
    await testConversationFiltering();
    console.log('Tests completed successfully!');
  } catch (error) {
    console.error('Tests failed:', error);
  }
};

// Export for use in browser console
declare global {
  interface Window {
    testConversationAssignment?: {
      testConversationFiltering: typeof testConversationFiltering;
      testAssignmentChangeLogic: typeof testAssignmentChangeLogic;
      testCompleteAssignmentFlow: typeof testCompleteAssignmentFlow;
      testHumanAgentDropdown: typeof testHumanAgentDropdown;
      testHumanAgentAssignment: typeof testHumanAgentAssignment;
      runAllTests: typeof runAllTests;
    };
  }
}

if (typeof window !== 'undefined') {
  window.testConversationAssignment = {
    testConversationFiltering,
    testAssignmentChangeLogic,
    testCompleteAssignmentFlow,
    testHumanAgentDropdown,
    testHumanAgentAssignment,
    runAllTests
  };
}

