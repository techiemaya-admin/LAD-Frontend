
// "use client";
// import { useEffect, useRef, useState } from "react";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Phone, Plus, UserPlus, X, ArrowRight, Sparkles, Users, Download } from "lucide-react";
// import { AnimatePresence, motion } from "framer-motion";
// import { apiGet, apiPost } from "@/lib/api";
// import Swal from 'sweetalert2';
// type Props = { onCreated: () => void; existingContacts?: Array<{ id: string; name: string; phone: string }>; };
// export function CreateNumberDialog({ onCreated, existingContacts = [] }: Props) {
//   const [open, setOpen] = useState(false);
//   const [step, setStep] = useState<"create" | "assign">("create");
//   const [importMethod, setImportMethod] = useState<"manual" | "twilio">("manual");
//   const [phoneNumber, setPhoneNumber] = useState("");
//   const [label, setLabel] = useState("");
//   const [twilioAccountSid, setTwilioAccountSid] = useState("");
//   const [twilioAuthToken, setTwilioAuthToken] = useState("");
//   const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
//   const [selectedAgent, setSelectedAgent] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [createdNumberId, setCreatedNumberId] = useState<string | null>(null);
//   const [agents, setAgents] = useState<{id:string; name:string}[]>([]);
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const playSelectionSound = () => {
//     try {
//       if (audioRef.current && audioRef.current.src && audioRef.current.readyState > 0) {
//         audioRef.current.play().catch(() => {});
//       }
//     } catch {}
//   };
//   // Load agents when dialog opens so we can show real names
//   useEffect(() => {
//     if (!open) return;
//     apiGet<{items:{id:string; name:string}[]}>("/api/voice-agents").then(r => setAgents(r.items));
//   }, [open]);
//   const handleCreate = async () => {
//     setLoading(true);
//     try {
//       if (importMethod === "twilio") {
//         // Create a single number using the entered Twilio phone number and label
//         const created = await apiPost<{id:string}>("/api/phoneNumbers", {
//           e164: twilioPhoneNumber,
//           label,
//           sid: twilioAuthToken,
//           account: twilioAccountSid,
//         });
//         setCreatedNumberId(created.id);
//       } else {
//         const created = await apiPost<{id:string}>("/api/phoneNumbers", {
//           e164: phoneNumber,
//           label,
//         });
//         setCreatedNumberId(created.id);
//       }
//       setStep("assign");
//     } finally {
//       setLoading(false);
//     }
//   };
//   const handleAssign = async () => {
//     if (!createdNumberId || !selectedAgent) return;
//     const result1 = await Swal.fire({
//       title: 'Are you sure?',
//       text: 'You are about to assign this phone number to the selected agent.',
//       icon: 'question',
//       showCancelButton: true,
//       confirmButtonText: 'Yes, assign it!'
//     });
//     if (!result1.isConfirmed) return;
//     const phone = importMethod === "twilio" ? twilioPhoneNumber : phoneNumber;
//     const agentName = agents.find(a => a.id === selectedAgent)?.name || selectedAgent;
//     const result2 = await Swal.fire({
//       title: 'Confirm Details',
//       html: `
//         <div>
//           <p><strong>Phone Number:</strong> ${phone}</p>
//           ${label ? `<p><strong>Label:</strong> ${label}</p>` : ''}
//           <p><strong>Agent:</strong> ${agentName}</p>
//         </div>
//       `,
//       icon: 'info',
//       showCancelButton: true,
//       confirmButtonText: 'Looks correct!'
//     });
//     if (!result2.isConfirmed) return;
//     setLoading(true);
//     try {
//       await apiPost(`/api/phoneNumbers/${createdNumberId}/assign`, { agentId: selectedAgent });
//       await Swal.fire({
//         title: 'Success!',
//         text: 'Phone number assigned successfully.',
//         icon: 'success',
//         confirmButtonText: 'Cool'
//       });
//     } catch (error) {
//       await Swal.fire({
//         title: 'Error!',
//         text: 'Something went wrong.',
//         icon: 'error'
//       });
//     } finally {
//       setLoading(false);
//       handleClose();
//     }
//   };
//   const handleSkip = async () => {
//     const result = await Swal.fire({
//       title: 'Skip Assignment?',
//       text: 'The phone number has been created. You can assign an agent later.',
//       icon: 'question',
//       showCancelButton: true,
//       confirmButtonText: 'Yes, skip'
//     });
//     if (result.isConfirmed) {
//       await Swal.fire({
//         title: 'Success!',
//         text: 'Phone number created successfully.',
//         icon: 'success'
//       });
//       handleClose();
//     }
//   };
//   const handleClose = () => {
//     setOpen(false);
//     setTimeout(() => {
//       setStep("create");
//       setImportMethod("manual");
//       setPhoneNumber("");
//       setLabel("");
//       setTwilioAccountSid("");
//       setTwilioAuthToken("");
//       setTwilioPhoneNumber("");
//       setSelectedAgent("");
//       setCreatedNumberId(null);
//       onCreated();
//     }, 400);
//   };
//   const modalVariants = {
//     hidden: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
//     visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
//     exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
//   } as const;
//   const stepVariants = {
//     hidden: { opacity: 0, x: 20, transition: { duration: 0.3, ease: "easeOut" } },
//     visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
//     exit: { opacity: 0, x: -20, transition: { duration: 0.2, ease: "easeIn" } },
//   } as const;
//   const isCreateReady = importMethod === "manual"
//     ? !!phoneNumber
//     : !!(twilioAccountSid && twilioAuthToken && twilioPhoneNumber);
//   return (
//     <>
//       <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
//         <Plus className="h-4 w-4" />
//         Create Phone Number
//       </Button>
//       <audio ref={audioRef} src="/sounds/selection.mp3" preload="auto" />
//       <Dialog open={open} onOpenChange={setOpen}>
//         <AnimatePresence mode="wait">
//           {open && (
//             <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-50">
//               <DialogContent className="sm:max-w-md overflow-hidden p-0 gap-0 border-none shadow-2xl" onClick={(e) => e.stopPropagation()}>
//                 <AnimatePresence mode="wait">
//                   {step === "create" ? (
//                     <motion.div key="create" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="relative w-full">
//                       <motion.div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} />
//                       <DialogHeader className="relative px-6 pt-8 pb-4">
//                         <DialogTitle className="sr-only">Add Phone Number</DialogTitle>
//                         <motion.div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 backdrop-blur-sm" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}>
//                           <Phone className="h-8 w-8 text-primary" />
//                         </motion.div>
//                         <motion.h2 className="text-center text-2xl font-semibold" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }}>
//                           Add Phone Number
//                         </motion.h2>
//                         <motion.p className="text-center text-sm text-muted-foreground mt-2" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}>
//                           Import a new number to your system
//                         </motion.p>
//                       </DialogHeader>
//                       <div className="px-6 pb-6 space-y-5">
//                         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }} className="w-full">
//                           <Tabs
//                             value={importMethod}
//                             onValueChange={(value) => {
//                               const v = value as "manual" | "twilio";
//                               setImportMethod(v);
//                               if (v === "manual") {
//                                 setTwilioAccountSid("");
//                                 setTwilioAuthToken("");
//                                 setTwilioPhoneNumber("");
//                               } else {
//                                 setPhoneNumber("");
//                               }
//                             }}
//                             className="w-full"
//                           >
//                             <TabsList className="grid w-full grid-cols-2 h-10">
//                               <TabsTrigger value="manual" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Manual</TabsTrigger>
//                               <TabsTrigger value="twilio" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
//                                 <Download className="h-4 w-4 mr-1" />
//                                 Twilio
//                               </TabsTrigger>
//                             </TabsList>
//                             <TabsContent value="manual" className="mt-4 space-y-5">
//                               <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
//                                 <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
//                                   <Phone className="h-4 w-4 text-primary" />
//                                   Phone Number
//                                 </Label>
//                                 <Input id="phone" placeholder="+1 (555) 000-0000" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-11" />
//                               </motion.div>
//                               <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
//                                 <Label htmlFor="label" className="flex items-center gap-2 text-sm font-medium">
//                                   <Sparkles className="h-4 w-4 text-primary" />
//                                   Label (Optional)
//                                 </Label>
//                                 <Input id="label" placeholder="Sales Line, Support, etc." value={label} onChange={(e) => setLabel(e.target.value)} className="h-11" />
//                               </motion.div>
//                             </TabsContent>
//                             <TabsContent value="twilio" className="mt-4 space-y-5">
//                               <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
//                                 <Label htmlFor="twilio-account-sid" className="flex items-center gap-2 text-sm font-medium">
//                                   <Users className="h-4 w-4 text-primary" />
//                                   Twilio Account SID
//                                 </Label>
//                                 <Input id="twilio-account-sid" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={twilioAccountSid} onChange={(e) => setTwilioAccountSid(e.target.value)} className="h-11" />
//                               </motion.div>
//                               <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
//                                 <Label htmlFor="twilio-auth-token" className="flex items-center gap-2 text-sm font-medium">
//                                   <Users className="h-4 w-4 text-primary" />
//                                   Twilio Auth Token
//                                 </Label>
//                                 <Input id="twilio-auth-token" type="password" placeholder="your_auth_token" value={twilioAuthToken} onChange={(e) => setTwilioAuthToken(e.target.value)} className="h-11" />
//                               </motion.div>
//                               <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
//                                 <Label htmlFor="twilio-phone" className="flex items-center gap-2 text-sm font-medium">
//                                   <Phone className="h-4 w-4 text-primary" />
//                                   Twilio Phone Number
//                                 </Label>
//                                 <Input id="twilio-phone" placeholder="+1 (555) 000-0000" value={twilioPhoneNumber} onChange={(e) => setTwilioPhoneNumber(e.target.value)} className="h-11" />
//                               </motion.div>
//                               <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
//                                 <Label htmlFor="label" className="flex items-center gap-2 text-sm font-medium">
//                                   <Sparkles className="h-4 w-4 text-primary" />
//                                   Label (Optional)
//                                 </Label>
//                                 <Input id="label" placeholder="Sales Line, Support, etc." value={label} onChange={(e) => setLabel(e.target.value)} className="h-11" />
//                               </motion.div>
//                             </TabsContent>
//                           </Tabs>
//                         </motion.div>
//                         <motion.div className="flex gap-3 pt-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
//                           <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 h-11">
//                             <X className="h-4 w-4 mr-2" />
//                             Cancel
//                           </Button>
//                           <Button onClick={handleCreate} disabled={!isCreateReady || loading} className="flex-1 h-11 bg-primary hover:bg-primary/90">
//                             Continue
//                             <ArrowRight className="h-4 w-4 ml-2" />
//                           </Button>
//                         </motion.div>
//                       </div>
//                     </motion.div>
//                   ) : (
//                     <motion.div key="assign" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="relative w-full">
//                       <motion.div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} />
//                       <DialogHeader className="relative px-6 pt-8 pb-4">
//                         <DialogTitle className="sr-only">Assign Agent</DialogTitle>
//                         <motion.div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 backdrop-blur-sm" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}>
//                           <UserPlus className="h-8 w-8 text-primary" />
//                         </motion.div>
//                         <motion.h2 className="text-center text-2xl font-semibold" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }}>
//                           Assign Agent
//                         </motion.h2>
//                         <motion.p className="text-center text-sm text-muted-foreground mt-2" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}>
//                           Choose an agent for this number or skip for now
//                         </motion.p>
//                       </DialogHeader>
//                       <div className="px-6 pb-6 space-y-4">
//                         <motion.div className="rounded-lg border bg-muted/30 p-4 space-y-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
//                           <div className="flex items-center gap-3">
//                             <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
//                               <Phone className="h-5 w-5 text-primary" />
//                             </div>
//                             <div>
//                               <p className="text-sm font-medium">{importMethod === "twilio" ? twilioPhoneNumber : phoneNumber}</p>
//                               {label && <p className="text-xs text-muted-foreground">{label}</p>}
//                             </div>
//                           </div>
//                         </motion.div>
//                         <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
//                           <Label className="flex items-center gap-2 text-sm font-medium">
//                             <UserPlus className="h-4 w-4 text-primary" />
//                             Select Agent
//                           </Label>
//                           <Select
//                             value={selectedAgent}
//                             onValueChange={(value) => {
//                               setSelectedAgent(value);
//                               playSelectionSound();
//                             }}
//                           >
//                             <SelectTrigger className="h-11">
//                               <SelectValue placeholder="Choose an agent..." />
//                             </SelectTrigger>
//                             <SelectContent>
//                               {agents.map(a => (
//                                 <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
//                               ))}
//                             </SelectContent>
//                           </Select>
//                         </motion.div>
//                         <motion.div className="flex flex-col gap-3 pt-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
//                           <Button onClick={handleAssign} disabled={loading || !selectedAgent} className="w-full h-11 bg-primary hover:bg-primary/90">
//                             <UserPlus className="h-4 w-4 mr-2" />
//                             Assign Agent
//                           </Button>
//                           <Button variant="ghost" onClick={handleSkip} className="w-full h-11 text-muted-foreground hover:text-foreground" disabled={loading}>
//                             Skip for now
//                           </Button>
//                         </motion.div>
//                       </div>
//                     </motion.div>
//                   )}
//                 </AnimatePresence>
//               </DialogContent>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </Dialog>
//     </>
//   );
// }
"use client";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Plus, UserPlus, X, ArrowRight, Sparkles, Users, Download } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { apiGet, apiPost } from "@/lib/api";
// Removed SweetAlert usage in favor of built-in confirmation modals
import { useToast } from "@/components/ui/app-toaster";
type Props = { onCreated: () => void; existingContacts?: Array<{ id: string; name: string; phone: string }>; };
export function CreateNumberDialog({ onCreated, existingContacts = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"create" | "assign">("create");
  const [importMethod, setImportMethod] = useState<"manual" | "twilio">("manual");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [label, setLabel] = useState("");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdNumberId, setCreatedNumberId] = useState<string | null>(null);
  const [agents, setAgents] = useState<{id:string; name:string}[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Local confirmation modal state
  const [confirmType, setConfirmType] = useState<null | "close" | "skip">(null);
  const { push } = useToast();
  const playSelectionSound = () => {
    try {
      if (audioRef.current && audioRef.current.src && audioRef.current.readyState > 0) {
        audioRef.current.play().catch(() => {});
      }
    } catch {}
  };
  // Load agents when dialog opens so we can show real names
  useEffect(() => {
    if (!open) return;
    apiGet<{items:{id:string; name:string}[]}>("/api/voice-agent").then(r => setAgents(r.items));
  }, [open]);
  const handleCreate = async () => {
    setLoading(true);
    try {
      if (importMethod === "twilio") {
        // Create a single number using the entered Twilio phone number and label
        const created = await apiPost<{id:string}>("/api/voice-agent/numbers", {
          e164: twilioPhoneNumber,
          label,
          sid: twilioAuthToken,
          account: twilioAccountSid,
        });
        setCreatedNumberId(created.id);
      } else {
        const created = await apiPost<{id:string}>("/api/voice-agent/numbers", {
          e164: phoneNumber,
          label,
        });
        setCreatedNumberId(created.id);
      }
      push({ variant: "success", title: "Phone number created" });
      setStep("assign");
    } catch (e) {
      push({ variant: "error", title: "Create failed", description: "Could not create phone number" });
    } finally {
      setLoading(false);
    }
  };
  // const handleAssign = async () => {
  //   if (!createdNumberId || !selectedAgent) return;
  //   const phone = importMethod === "twilio" ? twilioPhoneNumber : phoneNumber;
  //   const agentName = agents.find(a => a.id === selectedAgent)?.name || selectedAgent;
  //   const result = await Swal.fire({
  //     title: 'Are you sure the data is correct?',
  //     html: `
  //       <div class="text-left">
  //         <p><strong>Phone Number:</strong> ${phone}</p>
  //         ${label ? `<p><strong>Label:</strong> ${label}</p>` : ''}
  //         <p><strong>Agent:</strong> ${agentName}</p>
  //       </div>
  //     `,
  //     icon: 'question',
  //     showCancelButton: true,
  //     confirmButtonText: 'Yes, assign it!',
  //     cancelButtonText: 'Cancel'
  //   });
  //   if (!result.isConfirmed) return;
  //   setLoading(true);
  //   try {
  //     await apiPost(`/api/phoneNumbers/${createdNumberId}/assign`, { agentId: selectedAgent });
  //     await Swal.fire({
  //       title: 'Success!',
  //       text: 'Phone number assigned successfully.',
  //       icon: 'success',
  //       confirmButtonText: 'Cool'
  //     });
  //   } catch (error) {
  //     await Swal.fire({
  //       title: 'Error!',
  //       text: 'Something went wrong.',
  //       icon: 'error'
  //     });
  //   } finally {
  //     setLoading(false);
  //     handleClose();
  //   }
  // };
  const handleAssign = async () => {
    if (!createdNumberId || !selectedAgent) return;
    setLoading(true);
    try {
      await apiPost(`/api/voice-agent/numbers/${createdNumberId}/assign`, { agentId: selectedAgent });
      push({ variant: "success", title: "Assigned", description: "Phone number assigned to agent" });
    } catch (e) {
      push({ variant: "error", title: "Assignment failed", description: "Could not assign agent" });
    } finally {
      setLoading(false);
      handleClose();
    }
  };
  const requestSkip = () => setConfirmType("skip");
  const requestClose = () => setConfirmType("close");
  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setStep("create");
      setImportMethod("manual");
      setPhoneNumber("");
      setLabel("");
      setTwilioAccountSid("");
      setTwilioAuthToken("");
      setTwilioPhoneNumber("");
      setSelectedAgent("");
      setCreatedNumberId(null);
      onCreated();
    }, 400);
  };
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
    exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  } as const;
  const stepVariants = {
    hidden: { opacity: 0, x: 20, transition: { duration: 0.3, ease: "easeOut" } },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2, ease: "easeIn" } },
  } as const;
  const isCreateReady = importMethod === "manual"
    ? !!phoneNumber
    : !!(twilioAccountSid && twilioAuthToken && twilioPhoneNumber);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-2 bg-[#037f5c] text-white" aria-label="Create Phone Number">
        <Plus className="h-4 w-4" />
      </Button>
      <audio ref={audioRef} src="/sounds/selection.mp3" preload="auto" />
      <Dialog open={open} onOpenChange={(v) => { if (!v) requestClose(); else setOpen(v); }}>
        <AnimatePresence mode="wait">
          {open && (
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-50">
              <DialogContent showCloseButton={false} className="sm:max-w-xl overflow-hidden p-0 gap-0 border-none shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <AnimatePresence mode="wait">
                  {step === "create" ? (
                    <motion.div key="create" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="relative w-full">
                      <motion.div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} />
                      <DialogHeader className="relative px-6 pt-8 pb-4">
                        <DialogTitle className="sr-only">Add Phone Number</DialogTitle>
                        <motion.div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 backdrop-blur-sm" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}>
                          <Phone className="h-8 w-8 text-primary" />
                        </motion.div>
                        <button
                          type="button"
                          aria-label="Close"
                          onClick={requestClose}
                          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <motion.h2 className="text-center text-2xl font-semibold" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }}>
                          Add Phone Number
                        </motion.h2>
                        <motion.p className="text-center text-sm text-muted-foreground mt-2" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}>
                          Import a new number to your system
                        </motion.p>
                      </DialogHeader>
                      <div className="px-6 pb-6 space-y-5">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }} className="w-full">
                          <Tabs
                            value={importMethod}
                            onValueChange={(value) => {
                              const v = value as "manual" | "twilio";
                              setImportMethod(v);
                              if (v === "manual") {
                                setTwilioAccountSid("");
                                setTwilioAuthToken("");
                                setTwilioPhoneNumber("");
                              } else {
                                setPhoneNumber("");
                              }
                            }}
                            className="w-full"
                          >
                            <TabsList className="grid w-full grid-cols-2 h-10">
                              <TabsTrigger value="manual" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Manual</TabsTrigger>
                              <TabsTrigger value="twilio" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                <Download className="h-4 w-4 mr-1" />
                                Twilio
                              </TabsTrigger>
                            </TabsList>
                            <TabsContent value="manual" className="mt-4 space-y-5">
                              <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
                                <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                                  <Phone className="h-4 w-4 text-primary" />
                                  Phone Number
                                </Label>
                                <Input id="phone" placeholder="+1 (555) 000-0000" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-11" />
                              </motion.div>
                              <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
                                <Label htmlFor="label" className="flex items-center gap-2 text-sm font-medium">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  Label (Optional)
                                </Label>
                                <Input id="label" placeholder="Sales Line, Support, etc." value={label} onChange={(e) => setLabel(e.target.value)} className="h-11" />
                              </motion.div>
                            </TabsContent>
                            <TabsContent value="twilio" className="mt-4 space-y-5">
                              <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
                                <Label htmlFor="twilio-account-sid" className="flex items-center gap-2 text-sm font-medium">
                                  <Users className="h-4 w-4 text-primary" />
                                  Twilio Account SID
                                </Label>
                                <Input id="twilio-account-sid" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={twilioAccountSid} onChange={(e) => setTwilioAccountSid(e.target.value)} className="h-11" />
                              </motion.div>
                              <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
                                <Label htmlFor="twilio-auth-token" className="flex items-center gap-2 text-sm font-medium">
                                  <Users className="h-4 w-4 text-primary" />
                                  Twilio Auth Token
                                </Label>
                                <Input id="twilio-auth-token" type="password" placeholder="your_auth_token" value={twilioAuthToken} onChange={(e) => setTwilioAuthToken(e.target.value)} className="h-11" />
                              </motion.div>
                              <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
                                <Label htmlFor="twilio-phone" className="flex items-center gap-2 text-sm font-medium">
                                  <Phone className="h-4 w-4 text-primary" />
                                  Twilio Phone Number
                                </Label>
                                <Input id="twilio-phone" placeholder="+1 (555) 000-0000" value={twilioPhoneNumber} onChange={(e) => setTwilioPhoneNumber(e.target.value)} className="h-11" />
                              </motion.div>
                              <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
                                <Label htmlFor="label" className="flex items-center gap-2 text-sm font-medium">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  Label (Optional)
                                </Label>
                                <Input id="label" placeholder="Sales Line, Support, etc." value={label} onChange={(e) => setLabel(e.target.value)} className="h-11" />
                              </motion.div>
                            </TabsContent>
                          </Tabs>
                        </motion.div>
                        <motion.div className="flex gap-3 pt-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
                          <Button variant="outline" onClick={requestClose} className="flex-1 h-11">
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button onClick={handleCreate} disabled={!isCreateReady || loading} className="flex-1 h-11 bg-primary hover:bg-primary/90">
                            Continue
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="assign" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="relative w-full">
                      <motion.div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} />
                      <DialogHeader className="relative px-6 pt-8 pb-4">
                        <DialogTitle className="sr-only">Assign Agent</DialogTitle>
                        <motion.div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 backdrop-blur-sm" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}>
                          <UserPlus className="h-8 w-8 text-primary" />
                        </motion.div>
                        <button
                          type="button"
                          aria-label="Close"
                          onClick={requestClose}
                          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <motion.h2 className="text-center text-2xl font-semibold" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }}>
                          Assign Agent
                        </motion.h2>
                        <motion.p className="text-center text-sm text-muted-foreground mt-2" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}>
                          Choose an agent for this number or skip for now
                        </motion.p>
                      </DialogHeader>
                      <div className="px-6 pb-6 space-y-4">
                        <motion.div className="rounded-lg border bg-muted/30 p-4 space-y-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Phone className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{importMethod === "twilio" ? twilioPhoneNumber : phoneNumber}</p>
                              {label && <p className="text-xs text-muted-foreground">{label}</p>}
                            </div>
                          </div>
                        </motion.div>
                        <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <UserPlus className="h-4 w-4 text-primary" />
                            Select Agent
                          </Label>
                          <Select
                            value={selectedAgent}
                            onValueChange={(value) => {
                              setSelectedAgent(value);
                              playSelectionSound();
                            }}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Choose an agent..." />
                            </SelectTrigger>
                            <SelectContent>
                              {agents.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </motion.div>
                        <motion.div className="flex flex-col gap-3 pt-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
                          <Button onClick={handleAssign} disabled={loading || !selectedAgent} className="w-full h-11 bg-primary hover:bg-primary/90">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Agent
                          </Button>
                          <Button variant="ghost" onClick={requestSkip} className="w-full h-11 text-muted-foreground hover:text-foreground" disabled={loading}>
                            Skip for now
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </DialogContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Dialog>
      {/* Confirmation modal */}
      <Dialog open={!!confirmType} onOpenChange={(v) => { if (!v) setConfirmType(null); }}>
        <AnimatePresence>
          {confirmType && (
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-50">
              <DialogContent className="sm:max-w-md overflow-hidden p-0 gap-0 border-none shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <X className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">
                        {confirmType === "close" ? "Are you sure you want to close?" : "Skip assigning an agent?"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {confirmType === "close"
                          ? "Your progress in this dialog will be cleared."
                          : "You can assign an agent later from the numbers page."}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1 h-10" onClick={() => setConfirmType(null)}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-10 bg-primary hover:bg-primary/90"
                      onClick={() => {
                        if (confirmType === "close") {
                          setConfirmType(null);
                          handleClose();
                        } else {
                          setConfirmType(null);
                          push({ variant: "success", title: "Created", description: "Phone number created. You can assign later." });
                          handleClose();
                        }
                      }}
                    >
                      {confirmType === "close" ? "Yes, close" : "Yes, skip"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Dialog>
    </>
  );
}