import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import Documentation from '@/components/ui/resources/Documentation';
import { DEFAULT_DOC_ID } from '@/components/ui/resources/docs/docsRegistry';

const Document: FC = () => {
    const params = useParams();
    const docId = params.docId ?? DEFAULT_DOC_ID;
    return <Documentation docId={docId} mode="doc" />;
};

export default Document;

