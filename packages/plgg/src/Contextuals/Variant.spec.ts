import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  defineVariant,
  match,
} from "plgg/index";

const Circle = defineVariant("Circle")<{
  r: number;
}>();
const Square = defineVariant("Square")<{
  side: number;
}>();

type Circle = ReturnType<typeof Circle.make>;
type Square = ReturnType<typeof Square.make>;
type Shape = Circle | Square;

test("make builds the tagged box", () => {
  const c = Circle.make({ r: 2 });
  return all([
    check(c.__tag, toBe("Circle")),
    check(c.content.r, toBe(2)),
  ]);
});

test("tag is the literal", () =>
  check(Circle.tag, toBe("Circle")));

test("is guards by tag", () =>
  all([
    check(
      Circle.is(Circle.make({ r: 1 })),
      toBe(true),
    ),
    check(
      Circle.is(Square.make({ side: 1 })),
      toBe(false),
    ),
    check(Circle.is(42), toBe(false)),
  ]));

test("pattern folds through match", () => {
  const area = (s: Shape): number =>
    match(s)(
      [
        Circle.pattern(),
        (c) => Math.PI * c.content.r * c.content.r,
      ],
      [
        Square.pattern(),
        (q) => q.content.side * q.content.side,
      ],
    );
  return all([
    check(area(Square.make({ side: 3 })), toBe(9)),
    check(
      area(Circle.make({ r: 0 })),
      toBe(0),
    ),
  ]);
});
