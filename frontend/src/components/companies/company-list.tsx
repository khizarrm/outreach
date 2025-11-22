'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useCompanies } from '@/hooks/use-companies';
import { CompanyCard } from './company-card';

export function CompanyList() {
  const { companies, isLoading } = useCompanies();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[200px]" />
        ))}
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-[#6a6a6a] font-sans font-light text-sm">
          No companies found
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {companies.map((company, index) => (
        <CompanyCard key={company.id} company={company} index={index} />
      ))}
    </div>
  );
}

