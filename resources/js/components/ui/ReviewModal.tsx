import Modal from './Modal';
import ReviewForm from './ReviewForm';

interface ReviewModalProps {
    orderId: number;
    sellerName: string;
    listingTitle: string;
    onClose: () => void;
}

export default function ReviewModal({ orderId, sellerName, listingTitle, onClose }: ReviewModalProps) {
    return (
        <Modal title="Write a review" onClose={onClose} wide>
            <ReviewForm
                sellerName={sellerName}
                orders={[{ id: orderId, listing: { id: 0, title: listingTitle } }]}
                onDone={onClose}
                onCancel={onClose}
            />
        </Modal>
    );
}
