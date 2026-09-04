interface AgreementRendererProps {
  content: any;
  mode?: 'view' | 'preview';
}

export default function AgreementRenderer({ content, mode = 'view' }: AgreementRendererProps) {
  if (!content) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6 text-sm">
      {content.agreement_number && (
        <div className="text-center border-b border-border pb-4">
          <p className="text-xs text-muted-foreground">Agreement #{content.agreement_number}</p>
          {content.version && <p className="text-xs text-muted-foreground">Version {content.version}</p>}
          {content.generated_at && (
            <p className="text-xs text-muted-foreground">
              Generated {new Date(content.generated_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Parties */}
      <div className="grid md:grid-cols-2 gap-4">
        {content.tenant && (
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tenant</p>
            <p className="font-semibold">{content.tenant.full_name}</p>
            {content.tenant.email && <p className="text-xs text-muted-foreground">{content.tenant.email}</p>}
            {content.tenant.phone && <p className="text-xs text-muted-foreground">{content.tenant.phone}</p>}
          </div>
        )}
        {content.manager && (
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Manager / Landlord</p>
            <p className="font-semibold">{content.manager.full_name}</p>
            {content.manager.email && <p className="text-xs text-muted-foreground">{content.manager.email}</p>}
            {content.manager.phone && <p className="text-xs text-muted-foreground">{content.manager.phone}</p>}
          </div>
        )}
      </div>

      {/* Property */}
      {content.property && (
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Property</p>
          <p className="font-semibold">{content.property.title}</p>
          {content.property.address && <p className="text-xs text-muted-foreground">{content.property.address}</p>}
          {content.property.city && <p className="text-xs text-muted-foreground">{content.property.city}</p>}
          {content.property.amenities?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {content.property.amenities.map((a: string) => (
                <span key={a} className="text-xs bg-muted/60 text-primary px-2 py-0.5 rounded-full">{a}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tenancy terms */}
      {content.tenancy && (
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tenancy Terms</p>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-muted-foreground">Monthly Rent</p><p className="font-semibold">{Number(content.tenancy.monthly_rent).toLocaleString()}</p></div>
            {content.tenancy.security_deposit > 0 && (
              <div><p className="text-xs text-muted-foreground">Deposit</p><p className="font-semibold">{Number(content.tenancy.security_deposit).toLocaleString()}</p></div>
            )}
            <div><p className="text-xs text-muted-foreground">Start Date</p><p className="font-semibold">{content.tenancy.start_date}</p></div>
            <div><p className="text-xs text-muted-foreground">End Date</p><p className="font-semibold">{content.tenancy.end_date}</p></div>
            <div><p className="text-xs text-muted-foreground">Payment Frequency</p><p className="font-semibold capitalize">{content.tenancy.payment_frequency}</p></div>
          </div>
        </div>
      )}

      {/* Standard clauses */}
      {content.standard_clauses?.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Terms & Conditions</p>
          {content.standard_clauses.filter((c: any) => c.enabled !== false).map((clause: any, i: number) => (
            <div key={clause.key || i}>
              <p className="font-semibold text-sm mb-1">{clause.title}</p>
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{clause.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Custom clauses */}
      {content.custom_clauses?.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Additional Terms</p>
          {content.custom_clauses.map((clause: any, i: number) => (
            <div key={i}>
              <p className="font-semibold text-sm mb-1">{clause.title}</p>
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{clause.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Signatures */}
      {content.signatures && Object.keys(content.signatures).length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Signatures</p>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(content.signatures).map(([role, sig]: [string, any]) => (
              <div key={role} className={`rounded-lg border p-3 ${sig.signed_name ? 'border-success/30 bg-success/5' : 'border-border bg-muted/30'}`}>
                <p className="text-xs font-semibold text-muted-foreground capitalize mb-1">{role.replace(/_/g, ' ')}</p>
                {sig.signed_name ? (
                  <>
                    <p className="font-semibold text-success">{sig.signed_name}</p>
                    {sig.signed_at && <p className="text-xs text-muted-foreground">Signed {new Date(sig.signed_at).toLocaleDateString()}</p>}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Not yet signed</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
