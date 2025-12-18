import { useState, useEffect } from 'react';
import { Topic, TopicStatus, ContentType, User, Group, UserRole, ContentBlock, CourseModule } from '../types';
import { FileTextIcon, VideoIcon, PlusIcon, TrashIcon, EditIcon, CheckIcon, XIcon, UserCircleIcon, UsersIcon, SparklesIcon, LoaderIcon, UploadIcon, LinkIcon, ClipboardListIcon, ImageIcon } from './icons';
import ModuleEditor from './ModuleEditor';
import AnalyticsDashboard from './AnalyticsDashboard';
import { generateCourseFromPrompt, CourseResource } from '../services/geminiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CreatorSection = 'courses' | 'users' | 'settings' | 'analytics';

interface CreatorDashboardProps {
  topics: Topic[];
  users: User[];
  groups: Group[];
  categories: string[];
  currentUser?: User;
  section?: CreatorSection;
  onAddTopic: (topic: Topic) => void;
  onUpdateTopic: (topic: Topic) => void;
  onDeleteTopic: (id: string) => void;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onAddGroup: (group: Group) => void;
  onDeleteGroup: (id: string) => void;
  onAddCategory: (cat: string) => void;
  onDeleteCategory: (cat: string) => void;
}

export default function CreatorDashboard({
  topics, users, groups, categories, currentUser,
  section = 'courses',
  onAddTopic, onUpdateTopic, onDeleteTopic,
  onAddUser, onUpdateUser, onDeleteUser,
  onAddGroup, onDeleteGroup,
  onAddCategory, onDeleteCategory
}: CreatorDashboardProps) {
  const isAdmin = currentUser?.role === UserRole.Admin;
  const portalTitle = isAdmin ? 'Admin Portal' : 'Creator Studio';
  const portalDescription = isAdmin 
    ? 'Manage all courses, users, groups, and settings' 
    : 'Create and manage your courses and content';

  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [editTopicId, setEditTopicId] = useState<string | null>(null);

  const [topicTitle, setTopicTitle] = useState('');
  const [topicCategory, setTopicCategory] = useState('General');
  const [topicReadTime, setTopicReadTime] = useState(5);
  const [topicImage, setTopicImage] = useState('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200');
  const [isSop, setIsSop] = useState(false);

  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [uploadModeMap, setUploadModeMap] = useState<Record<number, boolean>>({});
  const [uploadingBlocks, setUploadingBlocks] = useState<Record<number, boolean>>({});

  const [shareMode, setShareMode] = useState<'all' | 'departments' | 'users'>('all');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResources, setAiResources] = useState<CourseResource[]>([]);
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourceType, setNewResourceType] = useState<ContentType>(ContentType.Document);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResourceUploadMode, setAiResourceUploadMode] = useState<'url' | 'file'>('file');
  const [aiResourceUploading, setAiResourceUploading] = useState(false);

  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.Learner);
  const [newUserGroups, setNewUserGroups] = useState<string[]>([]);

  const [newGroupInput, setNewGroupInput] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Password editing state
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const startEditTopic = (topic: Topic) => {
    console.log('startEditTopic - topic.modules:', topic.modules);
    setEditTopicId(topic.id);
    setTopicTitle(topic.title);
    setTopicCategory(topic.category);
    setTopicReadTime(topic.readTime);
    setTopicImage(topic.imageUrl);
    setIsSop(topic.isSop || false);
    setContentBlocks([...topic.content]);
    setCourseModules(topic.modules ? [...topic.modules] : []);
    
    // Set upload mode for blocks that have base64 data (uploaded files)
    const uploadModes: Record<number, boolean> = {};
    topic.content.forEach((block, index) => {
      if ((block.type === ContentType.Image || block.type === ContentType.Document) && 
          block.content?.startsWith('data:')) {
        uploadModes[index] = true;
      }
    });
    setUploadModeMap(uploadModes);

    if (topic.sharedWith.includes('group-3') && groups.find(g => g.id === 'group-3')?.name === 'All Employees') {
      setShareMode('all');
      setSelectedGroups([]);
      setSelectedUsers([]);
    } else if (topic.sharedWithUsers && topic.sharedWithUsers.length > 0) {
      setShareMode('users');
      setSelectedUsers(topic.sharedWithUsers);
      setSelectedGroups(topic.sharedWith);
    } else {
      setShareMode('departments');
      setSelectedGroups(topic.sharedWith);
      setSelectedUsers([]);
    }

    setIsEditingTopic(true);
  };

  const resetTopicForm = () => {
    setIsEditingTopic(false);
    setEditTopicId(null);
    setTopicTitle('');
    setTopicCategory(categories[0] || 'General');
    setTopicReadTime(5);
    setTopicImage('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200');
    setContentBlocks([{ type: ContentType.Paragraph, content: '', order: 1 }]);
    setCourseModules([]);
    setUploadModeMap({});
    setIsSop(false);
    setShareMode('all');
    setSelectedGroups([]);
    setSelectedUsers([]);
    setAiPrompt('');
    setAiResources([]);
  };

  const handleSaveTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) return;

    const validBlocks = contentBlocks.map((b, idx) => ({ ...b, order: idx + 1 }));

    let finalSharedWithGroups: string[] = [];
    let finalSharedWithUsers: string[] = [];

    if (shareMode === 'all') {
      const allGroup = groups.find(g => g.name === 'All Employees');
      if (allGroup) finalSharedWithGroups = [allGroup.id];
    } else if (shareMode === 'departments') {
      finalSharedWithGroups = selectedGroups;
    } else if (shareMode === 'users') {
      finalSharedWithUsers = selectedUsers;
    }

    const topicData: Topic = {
      id: editTopicId || Date.now().toString(),
      title: topicTitle,
      category: topicCategory || 'General',
      authorId: currentUser?.id || 'user-1',
      readTime: topicReadTime,
      imageUrl: topicImage,
      status: TopicStatus.Pending,
      content: validBlocks,
      modules: courseModules.length > 0 ? courseModules : undefined,
      sharedWith: finalSharedWithGroups,
      sharedWithUsers: finalSharedWithUsers,
      isSop: isSop
    };

    if (editTopicId) {
      onUpdateTopic(topicData);
    } else {
      onAddTopic(topicData);
    }
    resetTopicForm();
  };

  const addBlock = (type: ContentType) => {
    setContentBlocks([...contentBlocks, { type, content: '', title: '', order: contentBlocks.length + 1 }]);
  };

  const removeBlock = (index: number) => {
    const newBlocks = [...contentBlocks];
    newBlocks.splice(index, 1);
    setContentBlocks(newBlocks);
    const newMap = { ...uploadModeMap };
    delete newMap[index];
    setUploadModeMap(newMap);
  };

  const updateBlock = (index: number, field: keyof ContentBlock, value: any) => {
    setContentBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      newBlocks[index] = { ...newBlocks[index], [field]: value };
      return newBlocks;
    });
  };

  const toggleUploadMode = (index: number) => {
    setUploadModeMap(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleFileUpload = (index: number, file: File | null) => {
    if (!file) return;
    setUploadingBlocks(prev => ({ ...prev, [index]: true }));
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      updateBlock(index, 'content', result);
      if (!contentBlocks[index].title) {
        updateBlock(index, 'title', file.name);
      }
      setUploadingBlocks(prev => ({ ...prev, [index]: false }));
    };
    reader.onerror = () => {
      setUploadingBlocks(prev => ({ ...prev, [index]: false }));
      alert('Failed to upload file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const isAnyUploading = Object.values(uploadingBlocks).some(v => v);

  const addAiResource = () => {
    if (!newResourceUrl) return;
    setAiResources([...aiResources, { type: newResourceType, url: newResourceUrl, isFile: false }]);
    setNewResourceUrl('');
  };

  const handleAiResourceFileUpload = (file: File | null) => {
    if (!file) return;
    setAiResourceUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setAiResources([...aiResources, { 
        type: newResourceType, 
        url: '', 
        fileName: file.name,
        fileData: result,
        isFile: true 
      }]);
      setAiResourceUploading(false);
    };
    reader.onerror = () => {
      setAiResourceUploading(false);
      alert('Failed to upload file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const removeAiResource = (index: number) => {
    const newRes = [...aiResources];
    newRes.splice(index, 1);
    setAiResources(newRes);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() && aiResources.length === 0) {
      alert("Please enter a topic or add at least one resource.");
      return;
    }
    setIsGenerating(true);
    try {
      const effectivePrompt = aiPrompt || "Create a comprehensive course based on the provided resources.";
      const generatedData = await generateCourseFromPrompt(effectivePrompt, aiResources);

      setTopicTitle(generatedData.title);
      setTopicCategory(generatedData.category);
      setTopicReadTime(generatedData.readTime);

      if (generatedData.coverImageKeyword) {
        setTopicImage(`https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200`);
      }

      setContentBlocks(generatedData.content);
      setShowAiModal(false);
      setAiPrompt('');
      setAiResources([]);
      
      // Show the edit form so user can review and save the generated course
      setIsEditingTopic(true);
      setEditTopicId(null); // This is a new course, not editing existing
      
      // Show success message
      alert("Course content generated successfully! Please review the content below and click 'Create Course' to save it.");
    } catch (error) {
      alert("Failed to generate course. Please try again.");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const [isCreatingUserLoading, setIsCreatingUserLoading] = useState(false);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    setIsCreatingUserLoading(true);
    try {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: tempPassword,
          role: newUserRole,
          groupIds: newUserGroups,
        }),
      });

      if (response.ok) {
        const createdUser = await response.json();
        // Call onAddUser to update the local state
        onAddUser(createdUser);
        alert(`User Created! An email would be sent to ${newUserEmail} with their temporary password.`);
        
        setNewUserName('');
        setNewUserEmail('');
        setNewUserRole(UserRole.Learner);
        setNewUserGroups([]);
        setIsCreatingUser(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create user');
      }
    } catch (error) {
      alert('Failed to create user. Please try again.');
      console.error(error);
    } finally {
      setIsCreatingUserLoading(false);
    }
  };

  const handleUpdatePassword = async (userId: string) => {
    if (!newPasswordInput) {
      alert('Please enter a new password');
      return;
    }

    if (newPasswordInput.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: newPasswordInput }),
      });

      if (response.ok) {
        alert('Password updated successfully');
        setEditingPasswordUserId(null);
        setNewPasswordInput('');
        setShowNewPassword(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update password');
      }
    } catch (error) {
      alert('Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAddGroup = () => {
    if (!newGroupInput.trim()) return;
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: newGroupInput
    };
    onAddGroup(newGroup);
    setNewGroupInput('');
  };

  const handleAddCategory = () => {
    if (!newCategoryInput.trim()) return;
    onAddCategory(newCategoryInput);
    setNewCategoryInput('');
  };

  return (
    <div data-testid="card-creator-dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-portal-title">{portalTitle}</h1>
        <p className="text-muted-foreground">{portalDescription}</p>
      </div>

      <Card className="min-h-[80vh]">
        <div className="p-6">
          {section === 'courses' && (
            !isEditingTopic ? (
              <div>
                <div className="flex justify-between items-center gap-4 mb-6 flex-wrap">
                  <h2 className="text-2xl font-bold text-foreground">Content Management</h2>
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      onClick={() => setShowAiModal(true)}
                      className="bg-gradient-to-r from-chart-3 to-primary"
                      data-testid="button-ai-create"
                    >
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      AI Create Course
                    </Button>
                    <Button onClick={() => setIsEditingTopic(true)} data-testid="button-new-course">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      New Course
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topics.map(topic => (
                    <Card key={topic.id} className="p-4 flex flex-col" data-testid={`card-creator-topic-${topic.id}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{topic.title}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary">{topic.category}</Badge>
                            {topic.isSop && <Badge className="bg-chart-3 text-white">SOP</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEditTopic(topic)} data-testid={`button-edit-topic-${topic.id}`}>
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDeleteTopic(topic.id)} className="text-destructive" data-testid={`button-delete-topic-${topic.id}`}>
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{topic.readTime} min read</p>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveTopic} className="space-y-6">
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <h2 className="text-2xl font-bold text-foreground">{editTopicId ? 'Edit Course' : 'Create New Course'}</h2>
                  <Button variant="outline" type="button" onClick={resetTopicForm} data-testid="button-cancel-edit">
                    <XIcon className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="topicTitle">Title</Label>
                    <Input
                      id="topicTitle"
                      value={topicTitle}
                      onChange={e => setTopicTitle(e.target.value)}
                      placeholder="Course Title"
                      required
                      data-testid="input-topic-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="topicCategory">Category</Label>
                    <Select value={topicCategory} onValueChange={setTopicCategory}>
                      <SelectTrigger data-testid="select-topic-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="topicReadTime">Read Time (min)</Label>
                    <Input
                      id="topicReadTime"
                      type="number"
                      value={topicReadTime}
                      onChange={e => setTopicReadTime(parseInt(e.target.value) || 5)}
                      min={1}
                      data-testid="input-read-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="topicImage">Cover Image URL</Label>
                    <Input
                      id="topicImage"
                      value={topicImage}
                      onChange={e => setTopicImage(e.target.value)}
                      placeholder="https://..."
                      data-testid="input-cover-image"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch id="isSop" checked={isSop} onCheckedChange={setIsSop} data-testid="switch-is-sop" />
                    <Label htmlFor="isSop" className="flex items-center gap-2">
                      <ClipboardListIcon className="h-4 w-4" />
                      Mark as SOP
                    </Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center gap-4 flex-wrap">
                    <Label className="text-lg font-semibold">Content Blocks</Label>
                    <div className="flex gap-2 flex-wrap">
                      <Button type="button" variant="outline" size="sm" onClick={() => addBlock(ContentType.Paragraph)} data-testid="button-add-paragraph">
                        <FileTextIcon className="h-4 w-4 mr-1" /> Text
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => addBlock(ContentType.Image)} data-testid="button-add-image">
                        <ImageIcon className="h-4 w-4 mr-1" /> Image
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => addBlock(ContentType.Video)} data-testid="button-add-video">
                        <VideoIcon className="h-4 w-4 mr-1" /> Video
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => addBlock(ContentType.Document)} data-testid="button-add-document">
                        <FileTextIcon className="h-4 w-4 mr-1" /> Document
                      </Button>
                    </div>
                  </div>

                  {contentBlocks.map((block, index) => (
                    <Card key={index} className="p-4 bg-muted/50">
                      <div className="flex justify-between items-center gap-2 mb-2">
                        <Badge variant="outline">{block.type}</Badge>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeBlock(index)}>
                          <TrashIcon className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      {block.type === ContentType.Paragraph ? (
                        <Textarea
                          value={block.content}
                          onChange={e => updateBlock(index, 'content', e.target.value)}
                          placeholder="Enter text content..."
                          className="min-h-[100px]"
                        />
                      ) : (
                        <div className="space-y-2">
                          <Input
                            value={block.title || ''}
                            onChange={e => updateBlock(index, 'title', e.target.value)}
                            placeholder="Title/Caption"
                          />
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => toggleUploadMode(index)}>
                              {uploadModeMap[index] ? <LinkIcon className="h-4 w-4 mr-1" /> : <UploadIcon className="h-4 w-4 mr-1" />}
                              {uploadModeMap[index] ? 'Use URL' : 'Upload File'}
                            </Button>
                          </div>
                          {uploadModeMap[index] ? (
                            <div className="space-y-2">
                              <Input
                                type="file"
                                onChange={e => handleFileUpload(index, e.target.files?.[0] || null)}
                                accept={block.type === ContentType.Image ? 'image/*' : block.type === ContentType.Document ? '.pdf,.doc,.docx' : 'video/*'}
                                disabled={uploadingBlocks[index]}
                              />
                              {uploadingBlocks[index] && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <LoaderIcon className="h-4 w-4 animate-spin" />
                                  Processing file...
                                </div>
                              )}
                              {block.content && block.content.startsWith('data:') && !uploadingBlocks[index] && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <CheckIcon className="h-4 w-4" />
                                  {editTopicId ? 'File already saved (re-upload to replace)' : 'File loaded successfully'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Input
                              value={block.content}
                              onChange={e => updateBlock(index, 'content', e.target.value)}
                              placeholder="URL..."
                            />
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>

                <ModuleEditor
                  modules={courseModules}
                  contentBlocks={contentBlocks}
                  topicTitle={topicTitle}
                  onModulesChange={setCourseModules}
                />

                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Sharing Settings</Label>
                  <div className="flex gap-4 flex-wrap">
                    <Button type="button" variant={shareMode === 'all' ? 'default' : 'outline'} onClick={() => setShareMode('all')}>
                      All Employees
                    </Button>
                    <Button type="button" variant={shareMode === 'departments' ? 'default' : 'outline'} onClick={() => setShareMode('departments')}>
                      Departments
                    </Button>
                    <Button type="button" variant={shareMode === 'users' ? 'default' : 'outline'} onClick={() => setShareMode('users')}>
                      Specific Users
                    </Button>
                  </div>

                  {shareMode === 'departments' && (
                    <div className="flex gap-2 flex-wrap">
                      {groups.filter(g => g.name !== 'All Employees').map(group => (
                        <Badge
                          key={group.id}
                          variant={selectedGroups.includes(group.id) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            if (selectedGroups.includes(group.id)) {
                              setSelectedGroups(selectedGroups.filter(g => g !== group.id));
                            } else {
                              setSelectedGroups([...selectedGroups, group.id]);
                            }
                          }}
                        >
                          {group.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {shareMode === 'users' && (
                    <div className="flex gap-2 flex-wrap">
                      {users.map(user => (
                        <Badge
                          key={user.id}
                          variant={selectedUsers.includes(user.id) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            if (selectedUsers.includes(user.id)) {
                              setSelectedUsers(selectedUsers.filter(u => u !== user.id));
                            } else {
                              setSelectedUsers([...selectedUsers, user.id]);
                            }
                          }}
                        >
                          {user.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 items-center">
                  {isAnyUploading && (
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <LoaderIcon className="h-4 w-4 animate-spin" />
                      Uploading file...
                    </span>
                  )}
                  <Button type="submit" disabled={isAnyUploading} data-testid="button-save-topic">
                    {isAnyUploading ? (
                      <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckIcon className="h-4 w-4 mr-2" />
                    )}
                    {editTopicId ? 'Update Course' : 'Create Course'}
                  </Button>
                </div>
              </form>
            )
          )}

          {section === 'users' && (
            <div>
              <div className="flex justify-between items-center gap-4 mb-6 flex-wrap">
                <h2 className="text-2xl font-bold text-foreground">User Management</h2>
                <Button onClick={() => setIsCreatingUser(true)} data-testid="button-add-user">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>

              {isCreatingUser && (
              <Card className="p-6 mb-6">
                <form onSubmit={handleSaveUser} className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Create New User</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newUserName">Name</Label>
                      <Input
                        id="newUserName"
                        value={newUserName}
                        onChange={e => setNewUserName(e.target.value)}
                        required
                        data-testid="input-new-user-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newUserEmail">Email</Label>
                      <Input
                        id="newUserEmail"
                        type="email"
                        value={newUserEmail}
                        onChange={e => setNewUserEmail(e.target.value)}
                        required
                        data-testid="input-new-user-email"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as UserRole)}>
                        <SelectTrigger data-testid="select-new-user-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UserRole.Learner}>Learner</SelectItem>
                          <SelectItem value={UserRole.Creator}>Creator</SelectItem>
                          <SelectItem value={UserRole.Admin}>Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select 
                        value={newUserGroups[0] || ''} 
                        onValueChange={(v) => setNewUserGroups(v ? [v] : [])}
                      >
                        <SelectTrigger data-testid="select-new-user-department">
                          <SelectValue placeholder="Select department..." />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map(group => (
                            <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isCreatingUserLoading} data-testid="button-save-user">
                      {isCreatingUserLoading ? (
                        <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckIcon className="h-4 w-4 mr-2" />
                      )}
                      {isCreatingUserLoading ? 'Creating...' : 'Create User'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsCreatingUser(false)} disabled={isCreatingUserLoading}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <div className="space-y-3">
              {users.map(user => (
                <Card key={user.id} className="p-4" data-testid={`card-user-${user.id}`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <UserCircleIcon className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <p className="font-semibold text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="secondary">{user.role}</Badge>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          if (editingPasswordUserId === user.id) {
                            setEditingPasswordUserId(null);
                            setNewPasswordInput('');
                            setShowNewPassword(false);
                          } else {
                            setEditingPasswordUserId(user.id);
                            setNewPasswordInput('');
                            setShowNewPassword(false);
                          }
                        }} 
                        data-testid={`button-reset-password-${user.id}`}
                      >
                        {editingPasswordUserId === user.id ? 'Cancel' : 'Update Password'}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteUser(user.id)} className="text-destructive" data-testid={`button-delete-user-${user.id}`}>
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {editingPasswordUserId === user.id && (
                    <div className="mt-4 pt-4 border-t flex gap-2 items-end flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <Label htmlFor={`password-${user.id}`} className="text-sm text-muted-foreground mb-1 block">New Password (min 6 characters)</Label>
                        <div className="relative">
                          <Input
                            id={`password-${user.id}`}
                            type={showNewPassword ? "text" : "password"}
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            placeholder="Enter new password..."
                            data-testid={`input-new-password-${user.id}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <XIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleUpdatePassword(user.id)}
                        disabled={isUpdatingPassword || !newPasswordInput || newPasswordInput.length < 6}
                        data-testid={`button-confirm-password-${user.id}`}
                      >
                        {isUpdatingPassword ? 'Updating...' : 'Save Password'}
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
              </div>
            </div>
          )}

          {section === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Settings & Configuration</h2>

            <div className="space-y-8">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  Departments/Groups
                </h3>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {groups.map(group => (
                    <Badge key={group.id} variant="secondary" className="flex items-center gap-2">
                      {group.name}
                      {group.name !== 'All Employees' && (
                        <button onClick={() => onDeleteGroup(group.id)} className="text-destructive hover:text-destructive/80">
                          <XIcon className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newGroupInput}
                    onChange={e => setNewGroupInput(e.target.value)}
                    placeholder="New group name..."
                    data-testid="input-new-group"
                  />
                  <Button onClick={handleAddGroup} data-testid="button-add-group">
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Categories</h3>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {categories.map(cat => (
                    <Badge key={cat} variant="secondary" className="flex items-center gap-2">
                      {cat}
                      <button onClick={() => onDeleteCategory(cat)} className="text-destructive hover:text-destructive/80">
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newCategoryInput}
                    onChange={e => setNewCategoryInput(e.target.value)}
                    placeholder="New category name..."
                    data-testid="input-new-category"
                  />
                  <Button onClick={handleAddCategory} data-testid="button-add-category">
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>
            </div>
          )}

          {section === 'analytics' && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Platform Analytics</h2>
              <AnalyticsDashboard />
            </div>
          )}
        </div>
      </Card>

      <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-primary" />
              AI Course Generator
            </DialogTitle>
            <DialogDescription>
              Describe the course topic or add resources for AI to generate content from.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Course Topic/Description</Label>
              <Textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="E.g., Create a course about workplace safety for new employees..."
                className="min-h-[80px]"
                data-testid="textarea-ai-prompt"
              />
            </div>

            <div className="space-y-3">
              <Label>Resources (Optional)</Label>
              
              <div className="flex gap-2 items-center">
                <Select value={newResourceType} onValueChange={(v) => setNewResourceType(v as ContentType)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ContentType.Document}>PDF</SelectItem>
                    <SelectItem value={ContentType.Image}>Image</SelectItem>
                    <SelectItem value={ContentType.Video}>Video</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex gap-1 bg-muted rounded-md p-1">
                  <Button 
                    type="button" 
                    variant={aiResourceUploadMode === 'file' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setAiResourceUploadMode('file')}
                    className="gap-1"
                  >
                    <UploadIcon className="h-3 w-3" />
                    Upload
                  </Button>
                  <Button 
                    type="button" 
                    variant={aiResourceUploadMode === 'url' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setAiResourceUploadMode('url')}
                    className="gap-1"
                  >
                    <LinkIcon className="h-3 w-3" />
                    URL
                  </Button>
                </div>
              </div>

              {aiResourceUploadMode === 'url' ? (
                <div className="flex gap-2">
                  <Input
                    value={newResourceUrl}
                    onChange={e => setNewResourceUrl(e.target.value)}
                    placeholder={newResourceType === ContentType.Video ? "Video URL (YouTube, Vimeo, etc.)..." : "Resource URL..."}
                    className="flex-1"
                    data-testid="input-resource-url"
                  />
                  <Button type="button" variant="outline" onClick={addAiResource} disabled={!newResourceUrl}>
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-md p-3 cursor-pointer hover-elevate text-muted-foreground">
                    {aiResourceUploading ? (
                      <>
                        <LoaderIcon className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadIcon className="h-4 w-4" />
                        <span>
                          {newResourceType === ContentType.Document && "Choose PDF file"}
                          {newResourceType === ContentType.Image && "Choose image file"}
                          {newResourceType === ContentType.Video && "Choose video file"}
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept={
                        newResourceType === ContentType.Document ? ".pdf" :
                        newResourceType === ContentType.Image ? "image/*" :
                        "video/*"
                      }
                      onChange={(e) => handleAiResourceFileUpload(e.target.files?.[0] || null)}
                      disabled={aiResourceUploading}
                      data-testid="input-resource-file"
                    />
                  </label>
                </div>
              )}

              {aiResources.length > 0 && (
                <div className="space-y-2 mt-2">
                  <Label className="text-xs text-muted-foreground">Added Resources ({aiResources.length})</Label>
                  <div className="flex gap-2 flex-wrap">
                    {aiResources.map((res, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-2">
                        {res.type === ContentType.Document && <FileTextIcon className="h-3 w-3" />}
                        {res.type === ContentType.Image && <ImageIcon className="h-3 w-3" />}
                        {res.type === ContentType.Video && <VideoIcon className="h-3 w-3" />}
                        {res.isFile ? res.fileName : (res.url.length > 25 ? res.url.substring(0, 25) + '...' : res.url)}
                        <button onClick={() => removeAiResource(idx)} className="hover:text-destructive">
                          <XIcon className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAiModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAiGenerate} disabled={isGenerating} data-testid="button-generate-course">
              {isGenerating ? <LoaderIcon className="animate-spin h-4 w-4 mr-2" /> : <SparklesIcon className="h-4 w-4 mr-2" />}
              {isGenerating ? 'Generating...' : 'Generate Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
