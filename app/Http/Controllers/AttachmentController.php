<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Message;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AttachmentController extends Controller
{
    /**
     * Serve a private file, but only to the people who are allowed to see it:
     *
     *  - chat files: the two people in the conversation, unless the message
     *    was deleted (then only admins reviewing a dispute can still open it);
     *  - report evidence: whoever uploaded it, and admins.
     */
    public function show(Request $request, Attachment $attachment): BinaryFileResponse
    {
        $owner = $attachment->attachable;
        $user = $request->user();

        if ($owner instanceof Message) {
            $conversation = $owner->conversation;

            abort_unless(
                $user->isAdmin()
                || $conversation->buyer_id === $user->id
                || $conversation->seller_id === $user->id,
                403
            );

            if (! $user->isAdmin()) {
                // A deleted message must stop being reachable at once, even for
                // someone who still has the file's address from before it was
                // deleted: hiding the bubble alone would not be enough.
                abort_if($owner->isDeletedForEveryone(), 404);

                abort_if(
                    $owner->deletions()->where('user_id', $user->id)->exists(),
                    404
                );
            }
        } elseif ($owner instanceof Report) {
            abort_unless(
                $user->isAdmin()
                || ($attachment->user_id !== null && $attachment->user_id === $user->id),
                403
            );
        } else {
            abort(404);
        }

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
