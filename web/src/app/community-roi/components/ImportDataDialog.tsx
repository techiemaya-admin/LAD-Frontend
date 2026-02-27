'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Upload, Loader2, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import { contributionApi } from '@lad/frontend-features/community-roi'
import { useQueryClient } from '@tanstack/react-query'

export function ImportDataDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const queryClient = useQueryClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      console.log('[ImportDataDialog] Starting upload with file:', { 
        name: file.name, 
        size: file.size, 
        type: file.type 
      })
      
      const response = await contributionApi.importData(file)
      
      console.log('[ImportDataDialog] Upload successful:', response)
      setResult({ success: true, message: response.message || 'Data imported successfully' })
      // Invalidate queries to refresh dashboard data
      queryClient.invalidateQueries({ queryKey: ['community-roi'] })
      setTimeout(() => {
        setOpen(false)
        setFile(null)
        setResult(null)
      }, 2000)
    } catch (error: any) {
      console.error('[ImportDataDialog] Upload error:', error)
      
      // Extract detailed error message
      let errorMessage = error.message || 'Failed to upload file. Please try again.'
      
      // Check if error contains details from server
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
        if (error.response.data.hint) {
          errorMessage += '\n' + error.response.data.hint
        }
        if (error.response.data.details) {
          errorMessage += '\n' + JSON.stringify(error.response.data.details)
        }
      }
      
      setResult({ 
        success: false, 
        message: errorMessage
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Excel Data</DialogTitle>
          <DialogDescription>
            Upload the BNI Analysis Excel file to update dashboard metrics.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4 p-4 border-2 border-dashed rounded-lg border-slate-200 bg-slate-50/50 justify-center flex-col text-center">
            {file ? (
              <>
                <FileSpreadsheet className="h-10 w-10 text-emerald-500" />
                <div className="text-sm font-medium text-slate-900">{file.name}</div>
                <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</div>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-slate-300" />
                <div className="text-sm font-medium text-slate-600">Click to select file</div>
                <div className="text-xs text-slate-400">Supports .xlsx files</div>
              </>
            )}
            <Input 
              id="file-upload" 
              type="file" 
              accept=".xlsx,.xls" 
              className="hidden" 
              onChange={handleFileChange}
              disabled={uploading}
            />
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploading}
              className="mt-2"
            >
              Select File
            </Button>
          </div>

          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {result.message}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Import'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
