<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AttachmentController extends Controller
{
    /**
     * Serve a private chat attachment, but only to the two people in the
     * conversation (and admins reviewing a reported transaction).
     */
    public function show(Request $request, Attachment $attachment): BinaryFileResponse
    {
        $message = $attachment->attachable;

        abort_unless($message instanceof Message, 404);

        $conversation = $message->conversation;
        $user = $request->user();

        // A file the sender deleted for everyone, or that this person deleted
        // for themselves, is gone for them even if they still know the URL.
        // Admins can still open it: it may be evidence in a report.
        if (! $user->isAdmin()) {
            abort_if($message->deleted_for_everyone_at !== null, 404);
            abort_if(
                $message->hiddenBy()->where('users.id', $user->id)->exists(),
                404
            );
        }

        abort_unless(
            $user->isAdmin()
            || $conversation->buyer_id === $user->id
            || $conversation->seller_id === $user->id,
            403
        );

        $disk = Storage::disk($attachment->disk);

        abort_unless($disk->exists($attachment->path), 404);

        // Photos, videos and PDFs open in the browser; other files download.
        $inline = in_array($attachment->kind, ['image', 'video'], true)
            || $attachment->mime === 'application/pdf';

        return response()->file($disk->path($attachment->path), [
            'Content-Type' => $attachment->mime,
            'Content-Disposition' => ($inline ? 'inline' : 'attachment')
                .'; filename="'.addslashes($attachment->original_name).'"',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
