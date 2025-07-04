/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";
import { FC, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sheet, 
  SheetTrigger, 
  SheetContent, 
  SheetHeader,
  SheetTitle, 
  SheetDescription,
  SheetFooter 
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMeeting } from "@/hooks/useMeeting";
import { toast } from "react-hot-toast";
import { 
  Settings, 
  Info, 
  Shield, 
  Users, 
  Video, 
  Mic,
  Lock,
  Eye,
  EyeOff,
  Save,
  X,
  AlertCircle,
  Check,
  Clock
} from "lucide-react";

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  password: z.string().optional(),
  maxParticipants: z.number().min(2).max(100),
  settings: z.object({
    allowGuests: z.boolean(),
    muteOnJoin: z.boolean(),
    videoOnJoin: z.boolean(),
    waitingRoom: z.boolean(),
    chat: z.boolean(),
    screenShare: z.boolean(),
    recording: z.boolean(),
  })
});

type SettingsForm = z.infer<typeof schema>;

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 10
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3
    }
  }
};

const MeetingSettingsDrawer: FC = () => {
  // Use the meeting hook instead of Redux
  const { 
    meeting,
    isHost,
    isInMeeting,
    updateMeetingSettings,
    isLoading: meetingLoading,
    error: meetingError 
  } = useMeeting();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("general");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form with proper default values from meeting hook
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isDirty }, 
    watch,
    setValue,
    reset
  } = useForm<SettingsForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      password: "",
      maxParticipants: 10,
      settings: {
        allowGuests: true,
        muteOnJoin: false,
        videoOnJoin: true,
        waitingRoom: false,
        chat: true,
        screenShare: true,
        recording: false,
      }
    },
  });

  // Update form when meeting data changes
  useEffect(() => {
    if (meeting) {
      reset({
        title: meeting.title || "",
        description: meeting.description || "",
        password: "", // Don't populate password for security
        maxParticipants: meeting.maxParticipants || 10,
        settings: {
          allowGuests: meeting.settings?.allowGuests ?? true,
          muteOnJoin: meeting.settings?.muteOnJoin ?? false,
          videoOnJoin: meeting.settings?.videoOnJoin ?? true,
          waitingRoom: meeting.settings?.waitingRoom ?? false,
          chat: meeting.settings?.chat ?? true,
          screenShare: meeting.settings?.screenShare ?? true,
          recording: meeting.settings?.recording ?? false,
        }
      });
    }
  }, [meeting, reset]);

  const watchedSettings = watch("settings");

  // Check if user has permission to modify settings
  const canModifySettings = isHost && isInMeeting;

  const sections: SettingsSection[] = [
    {
      id: "general",
      title: "General",
      icon: <Info className="w-4 h-4" />,
      description: "Basic meeting information"
    },
    {
      id: "security",
      title: "Security",
      icon: <Shield className="w-4 h-4" />,
      description: "Access and security settings"
    },
    {
      id: "participants",
      title: "Participants",
      icon: <Users className="w-4 h-4" />,
      description: "Participant management"
    },
    {
      id: "media",
      title: "Media",
      icon: <Video className="w-4 h-4" />,
      description: "Audio and video settings"
    }
  ];

  const onSubmit = async (data: SettingsForm) => {
    if (!canModifySettings) {
      toast.error("Only the host can modify meeting settings");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Update meeting settings using the hook
      const result = await updateMeetingSettings({
        // title: data.title,
        // description: data.description,
        maxParticipants: data.maxParticipants,
        // settings: data.settings,
        // Only include password if it's provided
        ...(data.password && { password: data.password })
      });

      if (result.success) {
        toast.success("Meeting settings updated successfully!");
        setIsOpen(false);
      } else {
        toast.error(result.error || "Failed to update meeting settings");
      }
    } catch (error) {
      console.error("Failed to update meeting:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const SectionButton: FC<{ section: SettingsSection }> = ({ section }) => (
    <motion.button
      type="button"
      onClick={() => setActiveSection(section.id)}
      className={`
        w-full text-left p-3 rounded-lg transition-all duration-200
        ${activeSection === section.id
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white border border-transparent'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center
          ${activeSection === section.id ? 'bg-blue-500/30' : 'bg-slate-600/50'}
        `}>
          {section.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{section.title}</p>
          <p className="text-xs opacity-70 truncate">{section.description}</p>
        </div>
      </div>
    </motion.button>
  );

  const FormField: FC<{
    label: string;
    description?: string;
    error?: string;
    children: React.ReactNode;
  }> = ({ label, description, error, children }) => (
    <motion.div variants={itemVariants} className="space-y-2">
      <div>
        <Label className="text-sm font-medium text-slate-200">{label}</Label>
        {description && (
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        )}
      </div>
      {children}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1 text-red-400 text-xs"
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </motion.div>
      )}
    </motion.div>
  );

  const SwitchField: FC<{
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
  }> = ({ label, description, checked, onCheckedChange, disabled = false }) => (
    <motion.div 
      variants={itemVariants}
      className={`
        flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/50
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && (
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </motion.div>
  );

  const renderContent = () => {
    const isDisabled = !canModifySettings;

    switch (activeSection) {
      case "general":
        return (
          <motion.div variants={containerVariants} className="space-y-4">
            <FormField
              label="Meeting Title"
              description="A descriptive name for your meeting"
              error={errors.title?.message}
            >
              <Input
                {...register("title")}
                placeholder="Enter meeting title"
                className="bg-slate-700/50 border-slate-600 text-white"
                disabled={isDisabled}
              />
            </FormField>

            <FormField
              label="Description"
              description="Additional details about the meeting (optional)"
            >
              <Textarea
                {...register("description")}
                placeholder="Enter meeting description"
                className="bg-slate-700/50 border-slate-600 text-white resize-none"
                rows={3}
                disabled={isDisabled}
              />
            </FormField>

            <FormField
              label="Maximum Participants"
              description="Set the maximum number of participants"
              error={errors.maxParticipants?.message}
            >
              <Input
                type="number"
                {...register("maxParticipants", { valueAsNumber: true })}
                min={2}
                max={100}
                className="bg-slate-700/50 border-slate-600 text-white"
                disabled={isDisabled}
              />
            </FormField>
          </motion.div>
        );

      case "security":
        return (
          <motion.div variants={containerVariants} className="space-y-4">
            <FormField
              label="Meeting Password"
              description="Protect your meeting with a password (optional)"
            >
              <div className="relative">
                <Input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  className="bg-slate-700/50 border-slate-600 text-white pr-10"
                  disabled={isDisabled}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-slate-400 hover:text-white"
                  disabled={isDisabled}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </FormField>

            <SwitchField
              label="Waiting Room"
              description="Hold participants in a waiting room before joining"
              checked={watchedSettings.waitingRoom}
              onCheckedChange={(checked) => setValue("settings.waitingRoom", checked)}
              disabled={isDisabled}
            />

            <SwitchField
              label="Allow Guests"
              description="Allow participants to join without an account"
              checked={watchedSettings.allowGuests}
              onCheckedChange={(checked) => setValue("settings.allowGuests", checked)}
              disabled={isDisabled}
            />
          </motion.div>
        );

      case "participants":
        return (
          <motion.div variants={containerVariants} className="space-y-4">
            <SwitchField
              label="Mute on Join"
              description="Automatically mute participants when they join"
              checked={watchedSettings.muteOnJoin}
              onCheckedChange={(checked) => setValue("settings.muteOnJoin", checked)}
              disabled={isDisabled}
            />

            <SwitchField
              label="Video on Join"
              description="Participants join with video enabled by default"
              checked={watchedSettings.videoOnJoin}
              onCheckedChange={(checked) => setValue("settings.videoOnJoin", checked)}
              disabled={isDisabled}
            />

            <SwitchField
              label="Enable Chat"
              description="Allow participants to send messages during the meeting"
              checked={watchedSettings.chat}
              onCheckedChange={(checked) => setValue("settings.chat", checked)}
              disabled={isDisabled}
            />
          </motion.div>
        );

      case "media":
        return (
          <motion.div variants={containerVariants} className="space-y-4">
            <SwitchField
              label="Screen Sharing"
              description="Allow participants to share their screens"
              checked={watchedSettings.screenShare}
              onCheckedChange={(checked) => setValue("settings.screenShare", checked)}
              disabled={isDisabled}
            />

            <SwitchField
              label="Meeting Recording"
              description="Enable recording capabilities for this meeting"
              checked={watchedSettings.recording}
              onCheckedChange={(checked) => setValue("settings.recording", checked)}
              disabled={isDisabled}
            />

            {watchedSettings.recording && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-200">Recording Notice</p>
                    <p className="text-xs text-amber-200/80 mt-1">
                      Participants will be notified that the meeting is being recorded
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  // Don't render if not in a meeting
  if (!meeting) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50"
          disabled={!canModifySettings}
        >
          <Settings className="w-4 h-4 mr-2" />
          Meeting Settings
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-full sm:w-[600px] bg-slate-900/95 backdrop-blur-xl border-slate-700/50 p-0"
      >
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-48 border-r border-slate-700/50 p-4 space-y-2">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-1">Settings</h4>
              <p className="text-xs text-slate-400">
                {canModifySettings ? "Configure your meeting" : "View meeting settings"}
              </p>
            </div>
            
            {sections.map((section) => (
              <SectionButton key={section.id} section={section} />
            ))}

            {!canModifySettings && (
              <div className="mt-4 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-200">
                  Only the host can modify settings
                </p>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col">
            <SheetHeader className="p-6 border-b border-slate-700/50">
              <SheetTitle className="text-white">
                {sections.find(s => s.id === activeSection)?.title} Settings
              </SheetTitle>
              <SheetDescription className="text-slate-400">
                {sections.find(s => s.id === activeSection)?.description}
              </SheetDescription>
              {meetingError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {meetingError}
                </div>
              )}
            </SheetHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderContent()}
                  </motion.div>
                </AnimatePresence>
              </div>

              <SheetFooter className="border-t border-slate-700/50 p-6">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-slate-400">
                    {isDirty && canModifySettings && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1 text-xs"
                      >
                        <AlertCircle className="w-3 h-3" />
                        Unsaved changes
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      className="bg-slate-700/50 border-slate-600 text-slate-200"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {canModifySettings ? "Cancel" : "Close"}
                    </Button>
                    
                    {canModifySettings && (
                      <Button
                        type="submit"
                        disabled={isSubmitting || !isDirty || meetingLoading}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        {isSubmitting ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 mr-2"
                            >
                              <Clock className="w-4 h-4" />
                            </motion.div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </SheetFooter>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MeetingSettingsDrawer;