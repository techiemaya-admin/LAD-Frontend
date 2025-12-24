"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { safeStorage } from '../../utils/storage';
import { Box, Typography, Avatar, Chip, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, IconButton, Tabs, Tab, List, ListItem, ListItemText, ListItemAvatar, ListItemSecondaryAction, Divider, Paper, Menu, MenuItem, LinearProgress, AvatarGroup, Badge, useTheme, useMediaQuery, Collapse, Fade, CircularProgress, Grid, Zoom, Slide, Alert, Snackbar, FormControl, InputLabel, Select, Stack } from '@mui/material';
import api from '../../services/api';
import leadsService from '../../services/leadsService';
import AttachmentPreview from '../common/AttachmentPreview';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CommentIcon from '@mui/icons-material/Comment';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BusinessIcon from '@mui/icons-material/Business';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FlagIcon from '@mui/icons-material/Flag';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TimelineIcon from '@mui/icons-material/Timeline';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import SourceIcon from '@mui/icons-material/Source';
import StageIcon from '@mui/icons-material/AccountTree';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BlockIcon from '@mui/icons-material/Block';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArchiveIcon from '@mui/icons-material/Archive';
import { getStatusLabel } from '../../utils/statusMappings';
import { getFieldValue } from '../../utils/fieldMappings';
import { showSnackbar as showGlobalSnackbar } from '../../store/slices/bootstrapSlice';
import { selectStatuses, selectPriorities, selectSources } from '../../store/slices/masterDataSlice';
import { selectStages } from '../../store/slices/pipelineSlice';
import { updateLeadAction, deleteLeadAction } from '../../store/actions/pipelineActions';
import { 
  selectLeadCardActiveTab,
  selectLeadCardExpanded,
  selectLeadCardEditingOverview,
  selectLeadCardEditFormData,
  setLeadCardActiveTab,
  setLeadCardExpanded,
  setLeadCardEditingOverview,
  setLeadCardEditFormData,
  resetLeadCardEditFormData
} from '../../store/slices/uiSlice';
import { 
  selectUsers, 
  selectUsersLoading, 
  selectUsersError,
  User
} from '../../store/slices/usersSlice';
import { fetchUsersAction } from '../../store/actions/usersActions';
import { Lead } from '../leads/types';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
  [key: string]: unknown;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`lead-tabpanel-${index}`}
      aria-labelledby={`lead-tab-${index}`}
      {...other}
      style={{ 
        height: '100%',
        minHeight: '500px', // Fixed minimum height
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ 
        p: 3, 
        height: '100%',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </Box>
    </div>
  );
};

const a11yProps = (index: number) => ({
  id: `lead-tab-${index}`,
  'aria-controls': `lead-tabpanel-${index}`,
});

interface Note {
  id: string | number;
  content: string;
  user_id?: string | number;
  user_name?: string;
  user_avatar?: string | null;
  created_at?: string;
}

interface Comment {
  id: string | number;
  content: string;
  user_id?: string | number;
  user_name?: string;
  user_avatar?: string | null;
  created_at?: string;
}

interface Attachment {
  id: string | number;
  name: string;
  size?: number;
  type?: string;
  user_id?: string | number;
  uploadedAt?: string;
}

interface AssignedUser {
  id: string | number;
  name: string;
  avatar?: string | null;
}

interface PipelineLeadCardProps {
  lead: Lead;
  isPreview?: boolean;
  onDelete?: (leadId: string | number) => Promise<void> | void;
  onEdit?: (lead: Lead) => void;
  currentStage?: number;
  totalStages?: number;
  onStatusChange?: (leadId: string | number, status: string) => Promise<void> | void;
  assignedUsers?: AssignedUser[];
  teamMembers?: User[];
  activityData?: number[];
  probability?: number;
  onAddNote?: (note: string) => Promise<void> | void;
  onAddComment?: (comment: string) => Promise<void> | void;
  onAddAttachment?: (file: File) => Promise<void> | void;
  onDeleteNote?: (noteId: string | number) => Promise<void> | void;
  onDeleteComment?: (commentId: string | number) => Promise<void> | void;
  onDeleteAttachment?: (attachmentId: string | number) => Promise<void> | void;
  externalDetailsOpen?: boolean | null;
  onExternalDetailsClose?: (() => void) | null;
  hideCard?: boolean;
}

const PipelineLeadCard: React.FC<PipelineLeadCardProps> = ({ 
  lead, 
  isPreview = false, 
  onDelete, 
  onEdit, 
  currentStage = 0, 
  totalStages = 1, 
  onStatusChange, 
  assignedUsers = [], 
  teamMembers = [],
  activityData = [], 
  probability = 0, 
  onAddNote, 
  onAddComment, 
  onAddAttachment, 
  onDeleteNote, 
  onDeleteComment, 
  onDeleteAttachment,
  externalDetailsOpen = null,
  onExternalDetailsClose = null,
  hideCard = false
}) => {
  const dispatch = useDispatch();
  const statusOptions = useSelector(selectStatuses);
  const priorityOptions = useSelector(selectPriorities);
  const sourceOptions = useSelector(selectSources);
  const stageOptions = useSelector(selectStages);
  
  // Get team members from global Redux state
  const globalTeamMembers = useSelector(selectUsers);
  const teamMembersLoading = useSelector(selectUsersLoading);
  const teamMembersError = useSelector(selectUsersError);
  
  // Get leadCard state from Redux
  const globalActiveTab = useSelector(selectLeadCardActiveTab);
  const globalExpanded = useSelector(selectLeadCardExpanded);
  const globalEditingOverview = useSelector(selectLeadCardEditingOverview);
  const globalEditFormData = useSelector(selectLeadCardEditFormData);
  
  // Use global team members if available, fallback to props for backward compatibility
  const effectiveTeamMembers = globalTeamMembers.length > 0 ? globalTeamMembers : teamMembers;
  
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Use external dialog control if provided, otherwise use internal state
  const isDetailsOpen = externalDetailsOpen !== null ? externalDetailsOpen : detailsOpen;
  const handleDetailsClose = onExternalDetailsClose || (() => setDetailsOpen(false));
  
  // Local states that should remain local (component-specific UI states)
  const [newNote, setNewNote] = useState<string>('');
  const [newComment, setNewComment] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [statusAnchorEl, setStatusAnchorEl] = useState<HTMLElement | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ open: boolean; type: string; id: string | number | null }>({ open: false, type: '', id: null });
  
  // Edit states for notes and comments
  const [editingNote, setEditingNote] = useState<{ id: string | number | null; content: string }>({ id: null, content: '' });
  const [editingComment, setEditingComment] = useState<{ id: string | number | null; content: string }>({ id: null, content: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggable, setIsDraggable] = useState(false);
  
  // Loading states for individual tabs
  const [notesLoading, setNotesLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  
  // Local state for current status to handle optimistic updates
  const [currentStatus, setCurrentStatus] = useState(lead.status);
  
  // Local states that remain component-specific
  const [newTagInput, setNewTagInput] = useState('');

  const goalsArray = Array.isArray(lead.goals) ? lead.goals : 
                    typeof lead.goals === 'string' && lead.goals.trim() !== '' ? [lead.goals] : [];
  const tagsArray = Array.isArray(lead.tags) ? lead.tags : [];
  const allTags = [...new Set([...goalsArray, ...tagsArray])];

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cardRef = useRef(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead', lead },
    disabled: isPreview || isDetailsOpen
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    userSelect: 'none',
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleCardClick(event as unknown as React.MouseEvent);
    }
  };

  const handleTouchStart = () => {
    if (isMobile) {
      const timer = setTimeout(() => setMenuAnchorEl(cardRef.current), 500);
      return () => clearTimeout(timer);
    }
  };

  const handleDragHandleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDraggable(true);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDraggable(false);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Load team members via Redux when component mounts
  useEffect(() => {
    if (globalTeamMembers.length === 0 && !teamMembersLoading && !teamMembersError) {
      console.log('🌐 Loading team members via Redux...');
      dispatch(fetchUsersAction());
    }
  }, [dispatch, globalTeamMembers, teamMembersLoading, teamMembersError]); // Remove dependency on globalTeamMembers.length to prevent infinite loops

  // Initialize Redux editFormData when lead changes
  useEffect(() => {
    if (lead) {
      dispatch(resetLeadCardEditFormData(lead));
    }
  }, [lead, dispatch]);

  // Sync local status with prop changes
  useEffect(() => {
    setCurrentStatus(lead.status);
  }, [lead.status]);

  // Load tab data when dialog opens or tab changes
  useEffect(() => {
    if (isDetailsOpen) {
      loadTabData(globalActiveTab);
    }
  }, [isDetailsOpen, globalActiveTab]);

  // Load data for specific tab
  const loadTabData = async (tabIndex: number) => {
    if (!lead.id) return;

    try {
      switch (tabIndex) {
        case 1: // Notes tab
          if (notes.length === 0) {
            setNotesLoading(true);
            const fetchedNotes = await leadsService.getLeadNotes(lead.id);
            setNotes(fetchedNotes);
          }
          break;
        case 2: // Comments tab
          if (comments.length === 0) {
            setCommentsLoading(true);
            const fetchedComments = await leadsService.getLeadComments(lead.id);
            setComments(fetchedComments);
          }
          break;
        case 3: // Attachments tab
          if (attachments.length === 0) {
            setAttachmentsLoading(true);
            const fetchedAttachments = await leadsService.getLeadAttachments(lead.id);
            setAttachments(fetchedAttachments);
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error loading tab ${tabIndex} data:`, error);
      showSnackbar(`Failed to load ${['overview', 'notes', 'comments', 'attachments'][tabIndex]}`, 'error');
    } finally {
      setNotesLoading(false);
      setCommentsLoading(false);
      setAttachmentsLoading(false);
    }
  };

//   useEffect(() => {
//   const fetchComments = async () => {
//     try {
//       const res = await axios.get(`/api/leads/${lead.id}/comments`);
//       setComments(res.data);
//     } catch (err) {
//       console.error('Failed to fetch comments:', err);
//     }
//   };

//   fetchComments();
// }, [lead.id]);

// Fetch comments

  const handleCardClick = (event?: React.MouseEvent) => {
    if (!event) return;
    if (
      isDragging ||
      isDraggable ||
      event.target.closest('.MuiMenu-root') ||
      event.target.closest('.MuiDialog-root') ||
      event.target.closest('button') ||
      event.target.closest('.card-actions') ||
      event.target.closest('.drag-handle')
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setDetailsOpen(true);
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation();
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };

  // Get current user from token or auth context
  const getCurrentUserId = () => {
    try {
      const token = safeStorage.getItem('auth_token');
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.id;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  };

  // Check if current user can edit/delete item
  const canUserModify = (itemUserId?: string | number | null): boolean => {
    const currentUserId = getCurrentUserId();
    console.log('Checking permissions:', { currentUserId, itemUserId });
    return currentUserId && (currentUserId === itemUserId || currentUserId.toString() === itemUserId.toString());
  };

  const handleDeleteConfirmationOpen = (type: string, id: string | number, userId?: string | number | null) => {
    console.log(`Delete confirmation opened for ${type}:`, { id, userId });
    
    // Check user permissions
    if (!canUserModify(userId)) {
      showSnackbar('You can only delete your own items.', 'error');
      return;
    }

    setDeleteConfirmation({ open: true, type, id });
  };

  const handleDeleteConfirmationClose = () => {
    setDeleteConfirmation({ open: false, type: '', id: null });
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsLoading(true);
    try {
      const newNoteObj = await leadsService.addLeadNote(lead.id, newNote.trim());
      setNotes([newNoteObj, ...notes]);
      setNewNote('');
      showSnackbar('Note added successfully', 'success');
    } catch (error) {
      console.error('Failed to add note:', error);
      showSnackbar('Failed to add note', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsLoading(true);
    try {
      const newCommentObj = await leadsService.addLeadComment(lead.id, newComment.trim());
      setComments([newCommentObj, ...comments]);
      setNewComment('');
      showSnackbar('Comment added successfully', 'success');
    } catch (error) {
      console.error('Failed to add comment:', error);
      showSnackbar('Failed to add comment', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    try {
      const newAttachment = await leadsService.uploadLeadAttachment(lead.id, file);
      setAttachments([newAttachment, ...attachments]);
      showSnackbar('File uploaded successfully', 'success');
    } catch (error) {
      console.error('Failed to upload file:', error);
      showSnackbar('Failed to upload file', 'error');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteNote = async (noteId: string | number) => {
    console.log('Attempting to delete note:', noteId, 'for lead:', lead.id);
    try {
      setIsLoading(true);
      await leadsService.deleteLeadNote(lead.id, noteId);
      setNotes(notes.filter(note => note.id !== noteId));
      showSnackbar('Note deleted successfully', 'success');
      console.log('Note deleted successfully');
    } catch (error) {
      console.error('Failed to delete note:', error);
      showSnackbar(`Failed to delete note: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
    setDeleteConfirmation({ open: false, type: '', id: null });
  };

  const handleDeleteComment = async (commentId: string | number) => {
    console.log('Attempting to delete comment:', commentId, 'for lead:', lead.id);
    try {
      setIsLoading(true);
      await leadsService.deleteLeadComment(lead.id, commentId);
      setComments(comments.filter(comment => comment.id !== commentId));
      showSnackbar('Comment deleted successfully', 'success');
      console.log('Comment deleted successfully');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      showSnackbar(`Failed to delete comment: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
    setDeleteConfirmation({ open: false, type: '', id: null });
  };

  const handleDeleteAttachment = async (attachmentId: string | number) => {
    console.log('Attempting to delete attachment:', attachmentId, 'for lead:', lead.id);
    try {
      setIsLoading(true);
      await leadsService.deleteLeadAttachment(lead.id, attachmentId);
      setAttachments(attachments.filter(attachment => attachment.id !== attachmentId));
      showSnackbar('Attachment deleted successfully', 'success');
      console.log('Attachment deleted successfully');
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      showSnackbar(`Failed to delete attachment: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
    setDeleteConfirmation({ open: false, type: '', id: null });
  };

  // Edit handlers for notes and comments
  const handleEditNote = (note: Note) => {
    // Check user permissions
    if (!canUserModify(note.user_id)) {
      showSnackbar('You can only edit your own items.', 'error');
      return;
    }
    setEditingNote({ id: note.id, content: note.content });
  };

  const handleCancelEditNote = () => {
    setEditingNote({ id: null, content: '' });
  };

  const handleSaveEditNote = async () => {
    if (!editingNote.content.trim()) return;
    
    console.log('Attempting to update note:', editingNote.id);
    try {
      setIsLoading(true);
      const updatedNote = await leadsService.updateLeadNote(lead.id, editingNote.id, editingNote.content.trim());
      setNotes(notes.map(note => note.id === editingNote.id ? updatedNote : note));
      showSnackbar('Note updated successfully', 'success');
      setEditingNote({ id: null, content: '' });
    } catch (error) {
      console.error('Failed to update note:', error);
      showSnackbar(`Failed to update note: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    // Check user permissions
    if (!canUserModify(comment.user_id)) {
      showSnackbar('You can only edit your own items.', 'error');
      return;
    }
    setEditingComment({ id: comment.id, content: comment.content });
  };

  const handleCancelEditComment = () => {
    setEditingComment({ id: null, content: '' });
  };

  const handleSaveEditComment = async () => {
    if (!editingComment.content.trim()) return;
    
    console.log('Attempting to update comment:', editingComment.id);
    try {
      setIsLoading(true);
      const updatedComment = await leadsService.updateLeadComment(lead.id, editingComment.id, editingComment.content.trim());
      setComments(comments.map(comment => comment.id === editingComment.id ? updatedComment : comment));
      showSnackbar('Comment updated successfully', 'success');
      setEditingComment({ id: null, content: '' });
    } catch (error) {
      console.error('Failed to update comment:', error);
      showSnackbar(`Failed to update comment: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleStatusClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setStatusAnchorEl(event.currentTarget);
  };

  const handleStatusClose = () => {
    setStatusAnchorEl(null);
  };

  const handleStatusChange = async (status: string) => {
    handleStatusClose();
    
    // Optimistic update - update UI immediately
    setCurrentStatus(status);
    
    try {
      // Call the parent's status change handler
      await onStatusChange(lead.id, status);
      // Use global snackbar for status updates
      dispatch(showGlobalSnackbar({ 
        message: 'Status updated successfully', 
        severity: 'success' 
      }));
    } catch (error) {
      // Revert the optimistic update on error
      setCurrentStatus(lead.status);
      // Use global snackbar for error messages
      dispatch(showGlobalSnackbar({ 
        message: 'Failed to update status', 
        severity: 'error' 
      }));
    }
  };

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    onEdit?.(lead);
  };

  const handleArchiveClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    onStatusChange?.(lead.id, 'Inactive');
  };

  const handleDuplicateClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    showSnackbar('Duplicate feature coming soon!', 'info');
  };

  // Overview tab edit handlers
  const handleStartEdit = () => {
    dispatch(setLeadCardEditingOverview(true));
    
    // Use getFieldValue helper to get values from lead object
    const formData = {
      // Lead Information
      email: getFieldValue(lead, 'email') || '',
      phone: getFieldValue(lead, 'phone') || '',
      company: getFieldValue(lead, 'company') || '',
      assignee: getFieldValue(lead, 'assignee') || getFieldValue(lead, 'assigned_to_id') || '',
      source: getFieldValue(lead, 'source') || '',
      // Pipeline Information
      status: getFieldValue(lead, 'status') || '',
      priority: getFieldValue(lead, 'priority') || '',
      stage: getFieldValue(lead, 'stage') || '',
      // Deal Information
      amount: getFieldValue(lead, 'amount') || '',
      closeDate: getFieldValue(lead, 'closeDate') || getFieldValue(lead, 'close_date') || '',
      expectedCloseDate: getFieldValue(lead, 'expectedCloseDate') || getFieldValue(lead, 'expected_close_date') || '',
      // Description and Tags
      description: getFieldValue(lead, 'description') || '',
      tags: lead.tags || []
    };
    
    console.log('Starting edit with lead data:', lead);
    console.log('Initialized form data:', formData);
    dispatch(setLeadCardEditFormData(formData));
  };

  const handleCancelEdit = () => {
    dispatch(setLeadCardEditingOverview(false));
    setNewTagInput(''); // Reset tag input
    
    // Reset form data to original lead values using getFieldValue helper
    const originalFormData = {
      // Lead Information
      email: getFieldValue(lead, 'email') || '',
      phone: getFieldValue(lead, 'phone') || '',
      company: getFieldValue(lead, 'company') || '',
      assignee: getFieldValue(lead, 'assignee') || getFieldValue(lead, 'assigned_to_id') || '',
      source: getFieldValue(lead, 'source') || '',
      // Pipeline Information
      status: getFieldValue(lead, 'status') || '',
      priority: getFieldValue(lead, 'priority') || '',
      stage: getFieldValue(lead, 'stage') || '',
      // Deal Information
      amount: getFieldValue(lead, 'amount') || '',
      closeDate: getFieldValue(lead, 'closeDate') || getFieldValue(lead, 'close_date') || '',
      expectedCloseDate: getFieldValue(lead, 'expectedCloseDate') || getFieldValue(lead, 'expected_close_date') || '',
      // Description and Tags
      description: getFieldValue(lead, 'description') || '',
      tags: lead.tags || []
    };
    
    dispatch(setLeadCardEditFormData(originalFormData));
  };

  const handleSaveEdit = async () => {
    setIsLoading(true);
    try {
      // Prepare update data with proper field mapping
      const updateData = {
        ...globalEditFormData,
        // Ensure proper field mapping for backend (snake_case)
        assigned_to_id: globalEditFormData.assignee,
        close_date: globalEditFormData.closeDate,
        expected_close_date: globalEditFormData.expectedCloseDate
      };
      
      // Remove empty string values to avoid overwriting with empty data
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === '') {
          delete updateData[key];
        }
      });
      
      console.log('Updating lead with data:', updateData);
      console.log('Current globalEditFormData:', globalEditFormData);
      console.log('Original lead object:', lead);
      
      // Use Redux action instead of direct API call
      await dispatch(updateLeadAction(lead.id, updateData));
      
      dispatch(setLeadCardEditingOverview(false));
      setNewTagInput(''); // Reset tag input on successful save
      showSnackbar('Lead updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update lead:', error);
      showSnackbar(`Failed to update lead: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormFieldChange = (field: string, value: unknown) => {
    dispatch(setLeadCardEditFormData({
      ...globalEditFormData,
      [field]: value
    }));
  };

  // Tag management functions
  const handleAddTag = (newTag: string) => {
    if (newTag.trim() && !globalEditFormData.tags.includes(newTag.trim())) {
      handleFormFieldChange('tags', [...globalEditFormData.tags, newTag.trim()]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleFormFieldChange('tags', globalEditFormData.tags.filter(tag => tag !== tagToRemove));
  };

  // Helper function to get assignee name
  const getAssigneeName = (assigneeId?: string | number | null): string => {
    if (!assigneeId) return 'Unassigned';
    
    if (teamMembersLoading) {
      return `Loading...`;
    }
    
    if (effectiveTeamMembers.length === 0) {
      return 'Former User';
    }
    
    const member = effectiveTeamMembers.find(m => {
      const matches = [
        m.id === assigneeId,
        m._id === assigneeId,
        m.id === parseInt(assigneeId),
        m._id === parseInt(assigneeId),
        String(m.id) === String(assigneeId),
        String(m._id) === String(assigneeId)
      ];
      return matches.some(match => match);
    });
    
    return member ? member.name : 'Former User';
  };

  // Helper function to get field value with fallback (local override)
  const getFieldValueLocal = (obj: unknown, field: string): string => {
    if (!obj || typeof obj !== 'object') return '';
    const objRecord = obj as Record<string, unknown>;
    return String(objRecord[field] || objRecord[field.replace(/([A-Z])/g, '_$1').toLowerCase()] || '');
  };

  // Helper function to format date for input fields
  const formatDateForInput = (dateString?: string | Date | null): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  };

  // Helper function to get display label for options
  const getOptionLabel = (options: Array<{ key: string; label: string }>, key?: string): string => {
    const option = options.find(opt => opt.key === key);
    return option ? option.label : key;
  };

  const formatCurrency = (amount?: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const formatDate = (dateString?: string | Date | number | null): string => {
    if (!dateString) return 'No date set';
    
    // Handle various date formats and invalid dates
    try {
      let date;
      
      // If it's already a Date object
      if (dateString instanceof Date) {
        date = dateString;
      } else if (typeof dateString === 'string') {
        // Handle empty strings, 'null', 'undefined' strings
        if (dateString.trim() === '' || dateString === 'null' || dateString === 'undefined') {
          return 'No date set';
        }
        date = new Date(dateString);
      } else if (typeof dateString === 'number') {
        // Handle Unix timestamps (both seconds and milliseconds)
        date = new Date(dateString < 10000000000 ? dateString * 1000 : dateString);
      } else {
        return 'Invalid date';
      }
      
      // Check if the date is valid
      if (isNaN(date.getTime())) return 'Invalid date';
      
      // Check for unrealistic dates (before 1900 or too far in future)
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Date formatting error:', { dateString, error: error.message });
      return 'Invalid date';
    }
  };

  const getProgressValue = (): number => {
    return ((currentStage + 1) / totalStages) * 100;
  };

  const getDaysRemaining = (): number | null => {
    const closeDate = getFieldValueLocal(lead, 'closeDate');
    if (!closeDate) return null;
    
    try {
      const closeDateObj = new Date(closeDate);
      if (isNaN(closeDateObj.getTime())) return null;
      
      const today = new Date();
      const diffTime = closeDateObj - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return null;
    }
  };

  const getStatusColor = (status?: string | null): string => {
    switch (status?.toLowerCase()) {
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'blocked': return '#EF4444';
      case 'inactive': return '#64748B';
      case 'new': return '#3B82F6';
      case 'completed': return '#059669';
      default: return '#64748B';
    }
  };

  const getProbabilityColor = (prob: number): string => {
    if (prob >= 70) return '#10B981';
    if (prob >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const getStatusIcon = (status?: string | null): React.ReactElement => {
    switch (status?.toLowerCase()) {
      case 'active': return <CheckCircleIcon fontSize="small" />;
      case 'blocked': return <ErrorIcon fontSize="small" />;
      case 'pending': return <FlagIcon fontSize="small" />;
      case 'inactive': return <BlockIcon fontSize="small" />;
      case 'new': return <NewReleasesIcon fontSize="small" />;
      case 'completed': return <DoneAllIcon fontSize="small" />;
      default: return <FlagIcon fontSize="small" />;
    }
  };

  const getActivityTrend = (): number => {
    if (!activityData.length) return 0;
    const recent = activityData.slice(-2);
    return recent[1] - recent[0];
  };

  const handleClose = () => {
    if (onExternalDetailsClose) {
      onExternalDetailsClose();
    } else {
      setDetailsOpen(false);
    }
    dispatch(setLeadCardExpanded(false));
    setNewNote('');
    setNewComment('');
    dispatch(setLeadCardActiveTab(0)); 
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleConfirmDelete = async () => {
    const { type, id } = deleteConfirmation;
    console.log('handleConfirmDelete called with:', { type, id });
    
    if (type && id) {
      // Handle item deletion (note, comment, attachment)
      switch (type) {
        case 'note':
          console.log('Calling handleDeleteNote for note ID:', id);
          await handleDeleteNote(id);
          break;
        case 'comment':
          console.log('Calling handleDeleteComment for comment ID:', id);
          await handleDeleteComment(id);
          break;
        case 'attachment':
          console.log('Calling handleDeleteAttachment for attachment ID:', id);
          await handleDeleteAttachment(id);
          break;
        default:
          console.log('Unknown delete type:', type);
          break;
      }
    } else {
      // Handle lead deletion
      if (onDelete) {
        setIsLoading(true);
        try {
          await onDelete(lead.id);
          setDeleteDialogOpen(false);
          showSnackbar('Lead deleted successfully', 'success');
        } catch (error) {
          showSnackbar('Failed to delete lead', 'error');
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    dispatch(setLeadCardActiveTab(newValue));
  };

  const tabs = [
    { 
      label: 'Overview', 
      index: 0,
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid container spacing={3}>
            {/* Lead Information Section */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAFC' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ color: '#1E293B', fontWeight: 600 }}>
                  Lead Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {globalEditingOverview ? (
                    <>
                      <TextField
                        label="Email"
                        value={globalEditFormData.email || ''}
                        onChange={(e) => handleFormFieldChange('email', e.target.value)}
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: <EmailIcon sx={{ color: '#64748B', mr: 1 }} />
                        }}
                      />
                      <TextField
                        label="Phone"
                        value={globalEditFormData.phone || ''}
                        onChange={(e) => handleFormFieldChange('phone', e.target.value)}
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: <PhoneIcon sx={{ color: '#64748B', mr: 1 }} />
                        }}
                      />
                      <TextField
                        label="Company"
                        value={globalEditFormData.company || ''}
                        onChange={(e) => handleFormFieldChange('company', e.target.value)}
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: <BusinessIcon sx={{ color: '#64748B', mr: 1 }} />
                        }}
                      />
                      <FormControl fullWidth size="small">
                        <InputLabel>Assignee</InputLabel>
                        <Select
                          value={globalEditFormData.assignee || ''}
                          onChange={(e) => handleFormFieldChange('assignee', e.target.value)}
                          startAdornment={<AssignmentIndIcon sx={{ color: '#64748B', mr: 1 }} />}
                        >
                          {effectiveTeamMembers.map((member) => (
                            <MenuItem key={member.id} value={member.id}>
                              {member.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <InputLabel>Source</InputLabel>
                        <Select
                          value={globalEditFormData.source || ''}
                          onChange={(e) => handleFormFieldChange('source', e.target.value)}
                          startAdornment={<SourceIcon sx={{ color: '#64748B', mr: 1 }} />}
                        >
                          {sourceOptions.map((option) => (
                            <MenuItem key={option.key} value={option.key}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon sx={{ color: '#64748B' }} />
                        <Typography sx={{ color: '#1E293B' }}>{lead.email}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhoneIcon sx={{ color: '#64748B' }} />
                        <Typography sx={{ color: '#1E293B' }}>{lead.phone}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon sx={{ color: '#64748B' }} />
                        <Typography sx={{ color: '#1E293B' }}>{lead.company}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AssignmentIndIcon sx={{ color: '#64748B' }} />
                        <Typography sx={{ color: '#1E293B' }}>
                          {getAssigneeName(lead.assignee || lead.assigned_to_id)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SourceIcon sx={{ color: '#64748B' }} />
                        <Typography sx={{ color: '#1E293B' }}>
                          {getOptionLabel(sourceOptions, lead.source) || 'No source'}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>
            
            {/* Pipeline Information Section */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAFC' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ color: '#1E293B', fontWeight: 600 }}>
                  Pipeline Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {globalEditingOverview ? (
                    <>
                      <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={globalEditFormData.status || ''}
                          onChange={(e) => handleFormFieldChange('status', e.target.value)}
                          startAdornment={<CheckCircleIcon sx={{ color: getStatusColor(globalEditFormData.status), mr: 1 }} />}
                        >
                          {statusOptions.map((option) => (
                            <MenuItem key={option.key} value={option.key}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <InputLabel>Priority</InputLabel>
                        <Select
                          value={globalEditFormData.priority || ''}
                          onChange={(e) => handleFormFieldChange('priority', e.target.value)}
                          startAdornment={<PriorityHighIcon sx={{ color: '#64748B', mr: 1 }} />}
                        >
                          {priorityOptions.map((option) => (
                            <MenuItem key={option.key} value={option.key}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <InputLabel>Stage</InputLabel>
                        <Select
                          value={globalEditFormData.stage || ''}
                          onChange={(e) => handleFormFieldChange('stage', e.target.value)}
                          startAdornment={<StageIcon sx={{ color: '#64748B', mr: 1 }} />}
                        >
                          {stageOptions.map((option) => (
                            <MenuItem key={option.key} value={option.key}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon sx={{ color: getStatusColor(lead.status) }} />
                        <Typography sx={{ color: '#1E293B' }}>
                          {getOptionLabel(statusOptions, lead.status) || 'No status'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PriorityHighIcon sx={{ color: '#64748B' }} />
                        <Typography sx={{ color: '#1E293B' }}>
                          {getOptionLabel(priorityOptions, lead.priority) || 'No priority'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StageIcon sx={{ color: '#64748B' }} />
                        <Typography sx={{ color: '#1E293B' }}>
                          {getOptionLabel(stageOptions, lead.stage) || lead.stage || 'No stage'}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Deal Information Section */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAFC' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ color: '#1E293B', fontWeight: 600 }}>
                  Deal Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {globalEditingOverview ? (
                    <>
                      <TextField
                        label="Amount"
                        type="number"
                        value={globalEditFormData.amount || ''}
                        onChange={(e) => handleFormFieldChange('amount', parseFloat(e.target.value) || 0)}
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: <MonetizationOnIcon sx={{ color: '#10B981', mr: 1 }} />,
                          inputProps: { min: 0, step: 0.01 }
                        }}
                      />
                      <TextField
                        label="Close Date"
                        type="date"
                        value={globalEditFormData.closeDate ? formatDateForInput(globalEditFormData.closeDate) : ''}
                        onChange={(e) => handleFormFieldChange('closeDate', e.target.value)}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: <CalendarTodayIcon sx={{ color: '#64748B', mr: 1 }} />
                        }}
                      />
                      <TextField
                        label="Expected Close Date"
                        type="date"
                        value={globalEditFormData.expectedCloseDate ? formatDateForInput(globalEditFormData.expectedCloseDate) : ''}
                        onChange={(e) => handleFormFieldChange('expectedCloseDate', e.target.value)}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: <CalendarTodayIcon sx={{ color: '#2196F3', mr: 1 }} />
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MonetizationOnIcon sx={{ color: '#10B981' }} />
                        <Typography sx={{ color: '#1E293B' }}>
                          {formatCurrency(lead.amount || 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarTodayIcon sx={{ color: '#64748B' }} />
                        <Box>
                          <Typography sx={{ color: '#1E293B' }}>
                            Close Date: {formatDate(getFieldValueLocal(lead, 'closeDate')) || 'Not set'}
                          </Typography>
                          {getDaysRemaining() !== null && getDaysRemaining() < 7 && (
                            <Chip 
                              size="small" 
                              sx={{ 
                                mt: 0.5,
                                bgcolor: '#FEE2E2',
                                color: '#EF4444',
                                height: '20px',
                                fontSize: '0.75rem'
                              }}
                              label={`${getDaysRemaining()} days left`}
                            />
                          )}
                        </Box>
                      </Box>
                      {getFieldValueLocal(lead, 'expectedCloseDate') && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarTodayIcon sx={{ color: '#2196F3' }} />
                          <Typography sx={{ color: '#1E293B' }}>
                            Expected Close: {formatDate(getFieldValueLocal(lead, 'expectedCloseDate'))}
                          </Typography>
                        </Box>
                      )}
                      {getFieldValueLocal(lead, 'lastActivity') && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTimeIcon sx={{ color: '#9C27B0' }} />
                          <Typography sx={{ color: '#1E293B' }}>
                            Last Activity: {formatDate(getFieldValueLocal(lead, 'lastActivity'))}
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Description Section */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAFC' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ color: '#1E293B', fontWeight: 600 }}>
                  Description
                </Typography>
                {globalEditingOverview ? (
                  <TextField
                    multiline
                    rows={3}
                    value={globalEditFormData.description || ''}
                    onChange={(e) => handleFormFieldChange('description', e.target.value)}
                    placeholder="Enter lead description..."
                    fullWidth
                    size="small"
                  />
                ) : (
                  <Typography variant="body2" sx={{ color: '#64748B' }}>
                    {lead.description || 'No description provided'}
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Tags Section */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAFC' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ color: '#1E293B', fontWeight: 600 }}>
                  Tags
                </Typography>
                {globalEditingOverview ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Add New Tag"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(newTagInput);
                          setNewTagInput('');
                        }
                      }}
                      fullWidth
                      size="small"
                      placeholder="Enter tag and press Enter"
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            size="small"
                            onClick={() => {
                              handleAddTag(newTagInput);
                              setNewTagInput('');
                            }}
                            disabled={!newTagInput.trim()}
                          >
                            <AddIcon />
                          </IconButton>
                        )
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {globalEditFormData.tags && globalEditFormData.tags.map((tag, index) => (
                        <Chip 
                          key={index} 
                          label={tag} 
                          size="small"
                          onDelete={() => handleRemoveTag(tag)}
                          sx={{ 
                            bgcolor: '#E2E8F0',
                            color: '#1E293B',
                            height: '24px',
                            fontSize: '0.75rem'
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {allTags.map((tag, index) => (
                      <Chip 
                        key={index} 
                        label={tag} 
                        size="small"
                        sx={{ 
                          bgcolor: '#E2E8F0',
                          color: '#1E293B',
                          height: '24px',
                          fontSize: '0.75rem',
                          '&:hover': { 
                            transform: 'scale(1.05)',
                            bgcolor: '#CBD5E1'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      />
                    ))}
                    {allTags.length === 0 && (
                      <Typography variant="body2" sx={{ color: '#64748B', fontStyle: 'italic' }}>
                        No tags assigned
                      </Typography>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )
    },
    { 
      label: `Notes (${notes.length})`, 
      index: 1,
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAFC' }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Add a private note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              disabled={isLoading}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleAddNote}
                disabled={!newNote.trim() || isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <NoteAddIcon />}
                sx={{
                  bgcolor: '#3B82F6',
                  '&:hover': { bgcolor: '#2563EB' },
                  textTransform: 'none',
                  borderRadius: '8px'
                }}
              >
                Add Note
              </Button>
            </Box>
          </Paper>
          
          {notesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {notes.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No notes yet. Add your first note above.
                  </Typography>
                </Box>
              ) : (
                notes.map((note) => (
                  <ListItem key={note.id} alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar src={note.user_avatar} sx={{ bgcolor: '#10B981' }}>
                        {note.user_name?.charAt(0) || 'U'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography sx={{ color: '#1E293B', fontWeight: 500 }}>{note.user_name || 'User'}</Typography>}
                      secondary={
                        <>
                          {editingNote.id === note.id ? (
                            <Box sx={{ mt: 1 }}>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                value={editingNote.content}
                                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                                variant="outlined"
                                size="small"
                              />
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Button 
                                  size="small" 
                                  onClick={handleSaveEditNote} 
                                  disabled={isLoading}
                                  variant="contained"
                                  sx={{ 
                                    minWidth: 'auto', 
                                    px: 1.5,
                                    py: 0.5,
                                    bgcolor: '#10B981',
                                    '&:hover': { bgcolor: '#059669' }
                                  }}
                                >
                                  Save
                                </Button>
                                <Button 
                                  size="small" 
                                  onClick={handleCancelEditNote}
                                  variant="outlined"
                                  sx={{ 
                                    minWidth: 'auto', 
                                    px: 1.5,
                                    py: 0.5,
                                    borderColor: '#64748B',
                                    color: '#64748B',
                                    '&:hover': { 
                                      borderColor: '#475569',
                                      color: '#475569'
                                    }
                                  }}
                                >
                                  Cancel
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <>
                              <Typography component="span" variant="body2" sx={{ color: '#1E293B' }}>
                                {note.content}
                              </Typography>
                              <Typography variant="caption" display="block" sx={{ color: '#64748B' }}>
                                {formatDate(note.created_at)}
                              </Typography>
                            </>
                          )}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {editingNote.id !== note.id && canUserModify(note.user_id) && (
                          <Tooltip title="Edit note">
                            <IconButton
                              size="small"
                              onClick={() => handleEditNote(note)}
                              sx={{ 
                                color: '#64748B',
                                '&:hover': { 
                                  color: '#3B82F6',
                                  bgcolor: '#EFF6FF'
                                }
                              }}
                            >
                              ✏️
                            </IconButton>
                          </Tooltip>
                        )}
                        {canUserModify(note.user_id) && (
                          <Tooltip title="Delete note">
                            <IconButton
                              size="small"
                              onClick={() => {
                                console.log('Delete note button clicked for note ID:', note.id, 'userId:', note.user_id);
                                handleDeleteConfirmationOpen('note', note.id, note.user_id);
                              }}
                              sx={{ 
                                color: '#64748B',
                                '&:hover': { 
                                  color: '#EF4444',
                                  bgcolor: '#FEF2F2'
                                }
                              }}
                            >
                              🗑️
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              )}
            </List>
          )}
        </Box>
      )
    },
    { 
      label: `Comments (${comments.length})`, 
      index: 2,
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAFC' }}>
            <TextField
              fullWidth
              placeholder="Add a public comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isLoading}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleAddComment}
                disabled={!newComment.trim() || isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <CommentIcon />}
                sx={{
                  bgcolor: '#3B82F6',
                  '&:hover': { bgcolor: '#2563EB' },
                  textTransform: 'none',
                  borderRadius: '8px'
                }}
              >
                Add Comment
              </Button>
            </Box>
          </Paper>
          
          {commentsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {comments.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No comments yet. Add your first comment above.
                  </Typography>
                </Box>
              ) : (
                comments.map((comment) => (
                  <ListItem key={comment.id} alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar src={comment.user_avatar} sx={{ bgcolor: '#3B82F6' }}>
                        {comment.user_name?.charAt(0) || 'U'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography sx={{ color: '#1E293B', fontWeight: 500 }}>{comment.user_name || 'User'}</Typography>}
                      secondary={
                        <>
                          {editingComment.id === comment.id ? (
                            <Box sx={{ mt: 1 }}>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                value={editingComment.content}
                                onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                                variant="outlined"
                                size="small"
                              />
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Button 
                                  size="small" 
                                  onClick={handleSaveEditComment} 
                                  disabled={isLoading}
                                  variant="contained"
                                  sx={{ 
                                    minWidth: 'auto', 
                                    px: 1.5,
                                    py: 0.5,
                                    bgcolor: '#3B82F6',
                                    '&:hover': { bgcolor: '#2563EB' }
                                  }}
                                >
                                  Save
                                </Button>
                                <Button 
                                  size="small" 
                                  onClick={handleCancelEditComment}
                                  variant="outlined"
                                  sx={{ 
                                    minWidth: 'auto', 
                                    px: 1.5,
                                    py: 0.5,
                                    borderColor: '#64748B',
                                    color: '#64748B',
                                    '&:hover': { 
                                      borderColor: '#475569',
                                      color: '#475569'
                                    }
                                  }}
                                >
                                  Cancel
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <>
                              <Typography component="span" variant="body2" sx={{ color: '#1E293B' }}>
                                {comment.content}
                              </Typography>
                              <Typography variant="caption" display="block" sx={{ color: '#64748B' }}>
                                {formatDate(comment.created_at)}
                              </Typography>
                            </>
                          )}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {editingComment.id !== comment.id && canUserModify(comment.user_id) && (
                          <Tooltip title="Edit comment">
                            <IconButton
                              size="small"
                              onClick={() => handleEditComment(comment)}
                              sx={{ 
                                color: '#64748B',
                                '&:hover': { 
                                  color: '#3B82F6',
                                  bgcolor: '#EFF6FF'
                                }
                              }}
                            >
                              ✏️
                            </IconButton>
                          </Tooltip>
                        )}
                        {canUserModify(comment.user_id) && (
                          <Tooltip title="Delete comment">
                            <IconButton
                              size="small"
                              onClick={() => {
                                console.log('Delete comment button clicked for comment ID:', comment.id, 'userId:', comment.user_id);
                                handleDeleteConfirmationOpen('comment', comment.id, comment.user_id);
                              }}
                              sx={{ 
                                color: '#64748B',
                                '&:hover': { 
                                  color: '#EF4444',
                                  bgcolor: '#FEF2F2'
                                }
                              }}
                            >
                              🗑️
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              )}
            </List>
          )}
        </Box>
      )
    },
    { 
      label: `Attachments (${attachments.length})`, 
      index: 3,
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#F8FAFC' }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              disabled={isLoading}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                startIcon={isLoading ? <CircularProgress size={20} /> : <AttachFileIcon />}
                disabled={isLoading}
                sx={{ 
                  width: '100%', 
                  height: 100,
                  border: '2px dashed #CBD5E1',
                  borderRadius: '8px',
                  color: '#64748B',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#3B82F6',
                    color: '#3B82F6'
                  }
                }}
              >
                Drop files here or click to upload
              </Button>
            </Box>
          </Paper>

          {attachmentsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              {attachments.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No attachments yet. Upload your first file above.
                  </Typography>
                </Box>
              ) : (
                attachments.map((attachment) => (
                  <AttachmentPreview
                    key={attachment.id}
                    attachment={attachment}
                    onDelete={canUserModify(attachment.user_id) ? (attachmentId: string | number, userId?: string | number) => handleDeleteConfirmationOpen('attachment', attachmentId, userId) : null}
                  />
                ))
              )}
            </Box>
          )}
        </Box>
      )
    }
  ];

  // If hideCard is true, only render the dialog
  if (hideCard) {
    return (
      <>
        <Dialog 
          open={isDetailsOpen} 
          onClose={handleClose}
          maxWidth="md"
          fullWidth
          TransitionComponent={Zoom}
          transitionDuration={300}
          onClick={(e) => e.stopPropagation()}
          onBackdropClick={handleClose}
          disableEscapeKeyDown={false}
          keepMounted={false}
          PaperProps={{
            sx: {
              height: '85vh', // Fixed height to prevent resizing
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              m: 2,
              borderRadius: '12px',
              position: 'relative',
              zIndex: theme.zIndex.modal,
              boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }
          }}
          BackdropProps={{
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }
          }}
          sx={{
            zIndex: theme.zIndex.modal,
            '& .MuiDialogTitle-root': {
              padding: '16px 24px',
            },
            '& .MuiDialogContent-root': {
              padding: '0px',
            },
            '& .MuiDialogActions-root': {
              padding: '16px 24px',
            },
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  src={lead.avatar}
                  sx={{ 
                    width: 40, 
                    height: 40,
                    bgcolor: lead.avatar ? 'transparent' : 'primary.main'
                  }}
                >
                  {!lead.avatar && (lead.name?.charAt(0) || <PersonIcon />)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{lead.name}</Typography>
                  {lead.company && (
                    <Typography variant="body2" color="text.secondary">
                      {lead.company}
                    </Typography>
                  )}
                </Box>
              </Box>
              <IconButton 
                edge="end" 
                color="inherit" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent dividers sx={{ flex: 1, overflow: 'auto' }}>
            <Box sx={{ width: '100%' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={globalActiveTab} 
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  aria-label="lead details tabs"
                >
                  {tabs.map((tab) => (
                    <Tab 
                      key={tab.index}
                      label={tab.label}
                      {...a11yProps(tab.index)}
                    />
                  ))}
                </Tabs>
              </Box>

              {tabs.map((tab) => (
                <TabPanel key={tab.index} value={globalActiveTab} index={tab.index}>
                  {tab.content}
                </TabPanel>
              ))}
            </Box>
          </DialogContent>

          <DialogActions sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider', p: 2 }}>
            {globalActiveTab === 0 && ( // Only show edit buttons on Overview tab
              <>
                {globalEditingOverview ? (
                  <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                    <Button
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                      sx={{
                        textTransform: 'none',
                        color: '#64748B',
                        borderColor: '#CBD5E1',
                        '&:hover': {
                          borderColor: '#94A3B8',
                          bgcolor: '#F8FAFC'
                        }
                      }}
                      variant="outlined"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      disabled={isLoading}
                      startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                      sx={{
                        textTransform: 'none',
                        bgcolor: '#3B82F6',
                        '&:hover': { bgcolor: '#2563EB' }
                      }}
                      variant="contained"
                    >
                      Save Changes
                    </Button>
                  </Box>
                ) : (
                  <Button
                    onClick={handleStartEdit}
                    startIcon={<EditIcon />}
                    sx={{
                      textTransform: 'none',
                      ml: 'auto',
                      bgcolor: '#3B82F6',
                      '&:hover': { bgcolor: '#2563EB' }
                    }}
                    variant="contained"
                  >
                    Edit Lead
                  </Button>
                )}
              </>
            )}
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      onKeyPress={handleKeyPress}
      onTouchStart={handleTouchStart}
      role="button"
      tabIndex={0}
    >
      <Paper
        elevation={isDragging ? 8 : 2}
        sx={{
          borderRadius: '12px',
          boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          position: 'relative',
          width: '100%',
          height: '100%', 
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#FFFFFF',
          transition: 'all 0.3s ease-in-out',
          opacity: isDragging ? 0.5 : 1,
          '&:hover': {
            transform: isDragging ? 'none' : 'translateY(-2px)',
            boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        {/* Progress Bar with Animation */}
        <Fade in={true}>
          <LinearProgress
            variant="determinate"
            value={getProgressValue()}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              '& .MuiLinearProgress-bar': {
                transition: 'transform 0.8s ease-in-out',
              },
            }}
          />
        </Fade>

        {/* Header Section */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: 1, 
          mb: 1,
          minHeight: { xs: '48px', sm: '52px' }
        }}>
          <Box 
            className="drag-handle"
            onMouseDown={handleDragHandleMouseDown}
            sx={{ 
              cursor: 'grab',
              mt: 0.5,
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <DragIndicatorIcon 
              sx={{ 
                color: 'text.secondary',
                opacity: 0.5,
                fontSize: { xs: '1.1rem', sm: '1.2rem' }
              }} 
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5, gap: 0.75 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 600, 
                  fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  lineHeight: 1.3,
                  transition: 'color 0.3s ease',
                  color: isHovered ? '#3B82F6' : '#1E293B',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  flex: 1,
                  minWidth: 0
                }}
              >
                {lead.name}
              </Typography>

              {/* Probability Indicator */}
              <Tooltip title={`Success Probability: ${probability}%`}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress
                    variant="determinate"
                    value={probability}
                    size={20}
                    thickness={4}
                    sx={{ 
                      position: 'relative',
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      },
                      color: getProbabilityColor(probability)
                    }}
                  />
                </Box>
              </Tooltip>
            </Box>

            {lead.company && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  color: '#64748B',
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                <BusinessIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />
                {lead.company}
              </Typography>
            )}
          </Box>

          {activityData.length > 0 && (
            <Tooltip title="Activity Trend">
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                color: getActivityTrend() > 0 ? '#10B981' : '#EF4444'
              }}>
                {getActivityTrend() > 0 ? <TrendingUpIcon sx={{ fontSize: { xs: '1.1rem', sm: '1.2rem' } }} /> : <TrendingDownIcon sx={{ fontSize: { xs: '1.1rem', sm: '1.2rem' } }} />}
              </Box>
            </Tooltip>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <AvatarGroup 
              max={isMobile ? 2 : 3}
              sx={{
                '& .MuiAvatar-root': {
                  width: { xs: 20, sm: 24 },
                  height: { xs: 20, sm: 24 },
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    zIndex: 2,
                  },
                },
              }}
            >
              {assignedUsers.map((user, index) => (
                <Tooltip key={index} title={user.name}>
                  <Avatar src={user.avatar}>{user.name.charAt(0)}</Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>
          </Box>

          {/* Right side controls - Status and Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ml: 'auto' }}>
            {/* Status Chip - positioned far right */}
            <Chip
              size="small"
              label={getStatusLabel(currentStatus, statusOptions)}
              icon={getStatusIcon(currentStatus)}
              onClick={handleStatusClick}
              sx={{ 
                height: '20px',
                bgcolor: getStatusColor(currentStatus),
                color: 'white',
                m: 0,
                p: 0,
                minWidth: 0,
                '& .MuiChip-icon': {
                  color: 'inherit',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  m: 0,
                  p: 0
                },
                '& .MuiChip-label': {
                  px: 0.5,
                  py: 0,
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  lineHeight: 1
                }
              }}
            />

            {!isPreview && (
              <Box className="card-actions">
                {/* Menu button removed as requested */}
              </Box>
            )}
          </Box>
        </Box>

        <Collapse in={globalExpanded || !isMobile}>
          <Box sx={{
            mb: 2,
            flex: 1,
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#d1d5db',
              borderRadius: '2px',
              '&:hover': {
                background: '#9ca3af',
              },
            },
          }}>
            <Box sx={{
              display: 'flex',
              gap: 2,
              mb: 1.5,
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <Typography
                variant="h6"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: '#10B981',
                  fontWeight: 600,
                }}
              >
                <MonetizationOnIcon sx={{ fontSize: { xs: '1rem', sm: '1.1rem' }, color: '#10B981' }} />
                {formatCurrency(lead.amount || 0)}
              </Typography>

              {lead.closeDate && (
                <Tooltip title={getDaysRemaining() !== null ? `Due in ${getDaysRemaining()} days` : 'Invalid close date'}>
                  <Typography
                    variant="body2"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: getDaysRemaining() !== null && getDaysRemaining() < 7 ? '#EF4444' : '#64748B',
                    }}
                  >
                    <CalendarTodayIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, color: '#64748B' }} />
                    {formatDate(lead.closeDate)}
                  </Typography>
                </Tooltip>
              )}
            </Box>

            {lead.description && (
              <Typography
                variant="body2"
                sx={{
                  color: '#64748B',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: globalExpanded ? 'unset' : 2,
                  WebkitBoxOrient: 'vertical',
                  mb: 1,
                  transition: 'all 0.3s ease',
                }}
              >
                {lead.description}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {allTags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  sx={{
                    height: '20px',
                    bgcolor: '#E2E8F0',
                    color: '#1E293B',
                    '&:hover': {
                      bgcolor: '#CBD5E1',
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }
                  }}
                />
              ))}
            </Box>
          </Box>
        </Collapse>

        {/* Footer */}
        <Divider sx={{ my: 1 }} />
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mt: 'auto',
          pt: 1,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: { xs: '0.7rem', sm: '0.75rem' }
            }}
          >
            <AccessTimeIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />
            {formatDate(getFieldValueLocal(lead, 'createdAt'))}
          </Typography>

          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            transition: 'transform 0.3s ease',
            transform: isHovered ? 'translateX(-5px)' : 'translateX(0)',
          }}>
            {/* Assignee Avatar */}
            {(lead.assignee || lead.assigned_to_id) && (
              <Tooltip title={`Assigned to: ${getAssigneeName(lead.assignee || lead.assigned_to_id)}`}>
                <Avatar 
                  sx={{ 
                    width: 24, 
                    height: 24,
                    fontSize: '0.75rem',
                    bgcolor: 'primary.main'
                  }}
                >
                  {getAssigneeName(lead.assignee || lead.assigned_to_id)[0]?.toUpperCase()}
                </Avatar>
              </Tooltip>
            )}

            {notes.length > 0 && (
              <Tooltip title={`${notes.length} notes`}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <NoteAddIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} color="action" />
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{notes.length}</Typography>
                </Box>
              </Tooltip>
            )}
            {comments.length > 0 && (
              <Tooltip title={`${comments.length} comments`}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CommentIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} color="action" />
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{comments.length}</Typography>
                </Box>
              </Tooltip>
            )}
            {attachments.length > 0 && (
              <Tooltip title={`${attachments.length} attachments`}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AttachFileIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} color="action" />
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{attachments.length}</Typography>
                </Box>
              </Tooltip>
            )}
          </Box>
        </Box>
            {/* Menus removed as requested */}

        <Menu
          anchorEl={statusAnchorEl}
          open={Boolean(statusAnchorEl)}
          onClose={() => setStatusAnchorEl(null)}
          onClick={(e) => e.stopPropagation()}
        >
          {statusOptions.map((statusOption) => (
            <MenuItem 
              key={statusOption.key} 
              onClick={() => handleStatusChange(statusOption.key)}
            >
              {getStatusIcon(statusOption.key)}
              <Typography sx={{ ml: 1 }}>{statusOption.label}</Typography>
            </MenuItem>
          ))}
        </Menu>

        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteDialogClose}
          onClick={(e) => e.stopPropagation()}
        >
          <DialogTitle>Delete Lead</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete {lead.name}? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteDialogClose}>Cancel</Button>
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog for Items */}
        <Dialog
          open={deleteConfirmation.open}
          onClose={handleDeleteConfirmationClose}
          onClick={(e) => e.stopPropagation()}
          maxWidth="sm"
          PaperProps={{
            sx: {
              borderRadius: 2,
              p: 1
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            color: '#EF4444',
            fontWeight: 600
          }}>
            🗑️ Delete {deleteConfirmation.type?.charAt(0).toUpperCase() + deleteConfirmation.type?.slice(1)}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ color: '#374151' }}>
              Are you sure you want to delete this {deleteConfirmation.type}? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button 
              onClick={handleDeleteConfirmationClose}
              variant="outlined"
              sx={{ 
                borderColor: '#D1D5DB',
                color: '#6B7280',
                '&:hover': {
                  borderColor: '#9CA3AF',
                  bgcolor: '#F9FAFB'
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                console.log('Delete button clicked in dialog');
                handleConfirmDelete();
              }}
              color="error"
              variant="contained"
              disabled={isLoading}
              sx={{ 
                bgcolor: '#EF4444',
                '&:hover': { bgcolor: '#DC2626' },
                '&:disabled': { bgcolor: '#FCA5A5' }
              }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : '🗑️ Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog 
          open={isDetailsOpen} 
          onClose={handleClose}
          maxWidth="md"
          fullWidth
          TransitionComponent={Zoom}
          transitionDuration={300}
          onClick={(e) => e.stopPropagation()}
          onBackdropClick={handleClose}
          disableEscapeKeyDown={false}
          keepMounted={false}
          PaperProps={{
            sx: {
              minHeight: '80vh',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              m: 2,
              borderRadius: 2,
              position: 'relative',
              zIndex: theme.zIndex.modal
            }
          }}
          BackdropProps={{
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }
          }}
          sx={{
            zIndex: theme.zIndex.modal,
            '& .MuiDialogTitle-root': {
              padding: '16px 24px',
            },
            '& .MuiDialogContent-root': {
              padding: '0px',
            },
            '& .MuiDialogActions-root': {
              padding: '16px 24px',
            },
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  src={lead.avatar}
                  sx={{ 
                    width: 40, 
                    height: 40,
                    bgcolor: lead.avatar ? 'transparent' : 'primary.main'
                  }}
                >
                  {!lead.avatar && (lead.name?.charAt(0) || <PersonIcon />)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{lead.name}</Typography>
                  {lead.company && (
                    <Typography variant="body2" color="text.secondary">
                      {lead.company}
                    </Typography>
                  )}
                </Box>
              </Box>
              <IconButton 
                edge="end" 
                color="inherit" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent dividers sx={{ flex: 1, overflow: 'auto' }}>
            <Box sx={{ width: '100%' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={globalActiveTab} 
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  aria-label="lead details tabs"
                >
                  {tabs.map((tab) => (
                    <Tab 
                      key={tab.index}
                      label={tab.label}
                      {...a11yProps(tab.index)}
                    />
                  ))}
                </Tabs>
              </Box>

              {tabs.map((tab) => (
                <TabPanel key={tab.index} value={globalActiveTab} index={tab.index}>
                  {tab.content}
                </TabPanel>
              ))}
            </Box>
          </DialogContent>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            variant="filled"
            elevation={6}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </div>
  );
};

export default PipelineLeadCard; 