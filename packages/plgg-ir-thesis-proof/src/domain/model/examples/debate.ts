import { AttackGraph } from "plgg-ir-thesis-proof/domain/usecase/groundedExtension";

/**
 * The 論争空間 example from `metamodel-semantics.md`
 * §検証カタログ 11 生存判定: three 論旨 and two attacks —
 * 景気失速論 attacks 増税必要論, and 外需回復論 attacks
 * 景気失速論. Under Dung's grounded semantics the
 * survivors are `{外需回復論, 増税必要論}` (外需回復論
 * neutralises 景気失速論, so the attack on 増税必要論 is
 * lifted) and 景気失速論 is defeated.
 */
export const 論争空間: AttackGraph = {
  arguments: [
    "増税必要論",
    "景気失速論",
    "外需回復論",
  ],
  attacks: [
    {
      attacker: "景気失速論",
      target: "増税必要論",
    },
    {
      attacker: "外需回復論",
      target: "景気失速論",
    },
  ],
};
