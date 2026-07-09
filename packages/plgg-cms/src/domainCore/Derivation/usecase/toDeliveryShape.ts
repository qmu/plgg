import { sqlIdentString } from "plgg-sql";
import {
  type DeliveryShape,
  type ToDeliveryShape,
} from "plgg-cms/domainCore/Derivation/model/Seams";

/**
 * The one worked derivation seam: project the durable {@link Domain} to its
 * read-only {@link DeliveryShape}. Pure and deterministic (same domain → same
 * shape), so a regenerated delivery layer is a re-derivation, not a rewrite.
 * Typed as {@link ToDeliveryShape}, the interface tickets 9/17/26 mirror.
 */
export const toDeliveryShape: ToDeliveryShape = (
  domain,
): DeliveryShape => ({
  resources: domain.entities.map((e) => ({
    name: sqlIdentString(e.name),
    fields: e.fields.map((f) => ({
      name: sqlIdentString(f.name),
      kind: f.kind,
      nullable: f.nullable,
    })),
  })),
});
