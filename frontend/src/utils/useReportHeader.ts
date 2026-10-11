import { useAuth } from '../context/AuthContext';
import { useProductContext } from '../context/ProductContext';
import type { ReportHeader } from './qmicsReport';

// Header block for the QMICS Excel reports, filled from the app: the selected
// project (its name and PRJ-### ID), the signed-in user, today's date, and the
// module the report comes from. Reviewed/Approved By stay blank for sign-off.
export function useReportHeader(moduleName: string): ReportHeader {
  const { user } = useAuth();
  const { currentProduct } = useProductContext();
  return {
    projectName: currentProduct?.project?.name ?? currentProduct?.name ?? '',
    projectId: currentProduct?.project?.code ?? currentProduct?.productKey ?? '',
    moduleName,
    testType: '',
    preparedBy: user?.name ?? '',
    date: new Date().toLocaleDateString('en-GB'),
  };
}
